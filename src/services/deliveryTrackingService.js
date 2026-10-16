/**
 * Delivery Tracking Service
 * Handles real-time delivery tracking, GPS updates, and ETA calculations
 */

import { supabase } from '../lib/supabase'

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * Returns distance in kilometers
 */
export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c
  
  return Math.round(distance * 100) / 100 // Round to 2 decimal places
}

/**
 * Estimate delivery time based on distance
 * Returns estimated time in minutes
 */
export const estimateDeliveryTime = (distanceKm) => {
  const AVG_SPEED_KMH = 20 // Average speed in city traffic
  const BASE_TIME_MINUTES = 10 // Base time for preparation
  
  const travelTime = Math.ceil((distanceKm / AVG_SPEED_KMH) * 60)
  return BASE_TIME_MINUTES + travelTime
}

/**
 * Get delivery tracking information for an order
 */
export const getDeliveryTracking = async (orderId) => {
  try {
    const { data, error } = await supabase
      .from('delivery_tracking')
      .select(`
        *,
        delivery_person:delivery_personnel!delivery_person_id (
          id,
          full_name,
          phone,
          profile_photo_url,
          vehicle_type,
          vehicle_number,
          average_rating,
          current_location_lat,
          current_location_lng
        ),
        order:customer_orders!order_id (
          id,
          order_number,
          delivery_address,
          delivery_phone,
          delivery_name,
          total
        )
      `)
      .eq('order_id', orderId)
      .maybeSingle()
    
    if (error) throw error
    
    return { success: true, data }
  } catch (error) {
    console.error('Failed to get delivery tracking:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get delivery location history (GPS breadcrumbs)
 */
export const getLocationHistory = async (deliveryTrackingId, limit = 50) => {
  try {
    const { data, error } = await supabase
      .from('delivery_location_history')
      .select('*')
      .eq('delivery_tracking_id', deliveryTrackingId)
      .order('recorded_at', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    
    return { success: true, data }
  } catch (error) {
    console.error('Failed to get location history:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Subscribe to real-time delivery location updates
 */
export const subscribeToDeliveryUpdates = (orderId, callback) => {
  // Subscribe to delivery_tracking changes
  const trackingSubscription = supabase
    .channel(`delivery_tracking:${orderId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'delivery_tracking',
        filter: `order_id=eq.${orderId}`
      },
      (payload) => {
        console.log('Delivery tracking update:', payload)
        callback({ type: 'tracking', data: payload.new })
      }
    )
    .subscribe()
  
  // Also subscribe to location history for real-time GPS updates
  const locationSubscription = supabase
    .channel(`delivery_location:${orderId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'delivery_location_history'
      },
      async (payload) => {
        // Verify this location belongs to our order's delivery
        const { data: tracking } = await supabase
          .from('delivery_tracking')
          .select('id')
          .eq('order_id', orderId)
          .single()
        
        if (tracking && payload.new.delivery_tracking_id === tracking.id) {
          console.log('New location update:', payload)
          callback({ type: 'location', data: payload.new })
        }
      }
    )
    .subscribe()
  
  // Return unsubscribe function
  return () => {
    trackingSubscription.unsubscribe()
    locationSubscription.unsubscribe()
  }
}

/**
 * Update delivery person location (for delivery app)
 */
export const updateDeliveryLocation = async (deliveryTrackingId, location) => {
  try {
    const { latitude, longitude, accuracy, speed, heading, altitude } = location
    
    // Insert location history
    const { error: historyError } = await supabase
      .from('delivery_location_history')
      .insert({
        delivery_tracking_id: deliveryTrackingId,
        latitude,
        longitude,
        accuracy,
        speed_kmh: speed,
        heading,
        altitude
      })
    
    if (historyError) throw historyError
    
    // Update current location in delivery_tracking
    const { error: trackingError } = await supabase
      .from('delivery_tracking')
      .update({
        current_lat: latitude,
        current_lng: longitude
      })
      .eq('id', deliveryTrackingId)
    
    if (trackingError) throw trackingError
    
    // Also update delivery person's current location
    const { data: tracking } = await supabase
      .from('delivery_tracking')
      .select('delivery_person_id')
      .eq('id', deliveryTrackingId)
      .single()
    
    if (tracking?.delivery_person_id) {
      await supabase
        .from('delivery_personnel')
        .update({
          current_location_lat: latitude,
          current_location_lng: longitude,
          last_location_update: new Date().toISOString()
        })
        .eq('id', tracking.delivery_person_id)
    }
    
    return { success: true }
  } catch (error) {
    console.error('Failed to update delivery location:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update delivery status
 */
export const updateDeliveryStatus = async (deliveryTrackingId, status, notes = null) => {
  try {
    const updates = { status }
    if (notes) updates.delivery_notes = notes
    
    const { error } = await supabase
      .from('delivery_tracking')
      .update(updates)
      .eq('id', deliveryTrackingId)
    
    if (error) throw error
    
    // If status is delivered, also update order status
    if (status === 'delivered') {
      const { data: tracking } = await supabase
        .from('delivery_tracking')
        .select('order_id')
        .eq('id', deliveryTrackingId)
        .single()
      
      if (tracking) {
        await supabase
          .from('customer_orders')
          .update({
            status: 'delivered',
            delivered_at: new Date().toISOString()
          })
          .eq('id', tracking.order_id)
      }
    }
    
    return { success: true }
  } catch (error) {
    console.error('Failed to update delivery status:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get current ETA based on real-time location
 */
export const calculateCurrentETA = async (deliveryTrackingId) => {
  try {
    const { data: tracking, error } = await supabase
      .from('delivery_tracking')
      .select('current_lat, current_lng, destination_lat, destination_lng')
      .eq('id', deliveryTrackingId)
      .single()
    
    if (error) throw error
    
    if (!tracking.current_lat || !tracking.destination_lat) {
      return { success: false, error: 'Location data not available' }
    }
    
    const distance = calculateDistance(
      tracking.current_lat,
      tracking.current_lng,
      tracking.destination_lat,
      tracking.destination_lng
    )
    
    const eta = estimateDeliveryTime(distance)
    
    // Update tracking with new ETA
    await supabase
      .from('delivery_tracking')
      .update({
        distance_km: distance,
        estimated_time_minutes: eta
      })
      .eq('id', deliveryTrackingId)
    
    return {
      success: true,
      distance,
      eta,
      etaText: formatETA(eta)
    }
  } catch (error) {
    console.error('Failed to calculate ETA:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Format ETA in human-readable format
 */
const formatETA = (minutes) => {
  if (minutes < 60) {
    return `${minutes} minutes`
  } else {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours} hour${hours > 1 ? 's' : ''} ${mins > 0 ? `${mins} min` : ''}`
  }
}

/**
 * Check if delivery person is nearby (within 1km)
 */
export const checkIfNearby = async (deliveryTrackingId) => {
  try {
    const { data: tracking } = await supabase
      .from('delivery_tracking')
      .select('current_lat, current_lng, destination_lat, destination_lng, status')
      .eq('id', deliveryTrackingId)
      .single()
    
    if (!tracking?.current_lat) return { nearby: false }
    
    const distance = calculateDistance(
      tracking.current_lat,
      tracking.current_lng,
      tracking.destination_lat,
      tracking.destination_lng
    )
    
    const isNearby = distance <= 1 // Within 1km
    
    // Auto-update status to 'nearby' if within range and not already updated
    if (isNearby && tracking.status === 'in_transit') {
      await updateDeliveryStatus(deliveryTrackingId, 'nearby', 'Delivery person is nearby')
    }
    
    return { nearby: isNearby, distance }
  } catch (error) {
    console.error('Failed to check if nearby:', error)
    return { nearby: false, error: error.message }
  }
}

/**
 * Submit delivery feedback and rating
 */
export const submitDeliveryFeedback = async (deliveryTrackingId, rating, feedback) => {
  try {
    const { error } = await supabase
      .from('delivery_tracking')
      .update({
        rating,
        feedback
      })
      .eq('id', deliveryTrackingId)
    
    if (error) throw error
    
    return { success: true, message: 'Feedback submitted successfully' }
  } catch (error) {
    console.error('Failed to submit feedback:', error)
    return { success: false, error: error.message }
  }
}

export default {
  calculateDistance,
  estimateDeliveryTime,
  getDeliveryTracking,
  getLocationHistory,
  subscribeToDeliveryUpdates,
  updateDeliveryLocation,
  updateDeliveryStatus,
  calculateCurrentETA,
  checkIfNearby,
  submitDeliveryFeedback
}
