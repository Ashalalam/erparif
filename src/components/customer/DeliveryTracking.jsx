import React, { useState, useEffect, useRef } from 'react'
import {
  MapPin, Navigation, Clock, Phone, User, Star,
  Truck, Package, CheckCircle, AlertCircle, MessageSquare
} from 'lucide-react'
import {
  getDeliveryTracking,
  subscribeToDeliveryUpdates,
  calculateCurrentETA,
  submitDeliveryFeedback
} from '../../services/deliveryTrackingService'
import toast from 'react-hot-toast'

const DeliveryTracking = ({ orderId }) => {
  const [tracking, setTracking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [eta, setEta] = useState(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const unsubscribeRef = useRef(null)

  useEffect(() => {
    loadTracking()
    
    // Subscribe to real-time updates
    const unsubscribe = subscribeToDeliveryUpdates(orderId, handleTrackingUpdate)
    unsubscribeRef.current = unsubscribe
    
    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [orderId])

  const loadTracking = async () => {
    try {
      setLoading(true)
      const result = await getDeliveryTracking(orderId)
      
      if (result.success && result.data) {
        setTracking(result.data)
        
        // Calculate ETA if delivery is in progress
        if (result.data.id && ['in_transit', 'nearby'].includes(result.data.status)) {
          updateETA(result.data.id)
        }
      }
    } catch (error) {
      console.error('Failed to load tracking:', error)
      toast.error('Failed to load delivery tracking')
    } finally {
      setLoading(false)
    }
  }

  const updateETA = async (trackingId) => {
    const result = await calculateCurrentETA(trackingId)
    if (result.success) {
      setEta(result)
    }
  }

  const handleTrackingUpdate = (update) => {
    console.log('Tracking update received:', update)
    
    if (update.type === 'tracking') {
      setTracking(prev => ({ ...prev, ...update.data }))
      
      // Recalculate ETA on status change
      if (['in_transit', 'nearby'].includes(update.data.status)) {
        updateETA(update.data.id)
      }
      
      // Show toast for status changes
      const statusMessages = {
        'picked_up': '📦 Your order has been picked up!',
        'in_transit': '🚚 Your order is on the way!',
        'nearby': '📍 Delivery person is nearby!',
        'arrived': '🏠 Delivery person has arrived!',
        'delivered': '✅ Order delivered successfully!'
      }
      
      if (statusMessages[update.data.status]) {
        toast.success(statusMessages[update.data.status])
      }
    } else if (update.type === 'location') {
      // Location update - recalculate ETA
      if (tracking?.id) {
        updateETA(tracking.id)
      }
    }
  }

  const handleSubmitFeedback = async () => {
    if (rating === 0) {
      toast.error('Please select a rating')
      return
    }

    const result = await submitDeliveryFeedback(tracking.id, rating, feedback)
    
    if (result.success) {
      toast.success('Thank you for your feedback!')
      setShowFeedback(false)
      loadTracking() // Reload to show submitted feedback
    } else {
      toast.error('Failed to submit feedback')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tracking information...</p>
        </div>
      </div>
    )
  }

  if (!tracking) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-yellow-900 mb-2">
          Tracking Not Available Yet
        </h3>
        <p className="text-yellow-700 text-sm">
          Delivery tracking will be available once your order is dispatched and assigned to a delivery person.
        </p>
      </div>
    )
  }

  const statusSteps = [
    { key: 'assigned', label: 'Assigned', icon: User },
    { key: 'picked_up', label: 'Picked Up', icon: Package },
    { key: 'in_transit', label: 'In Transit', icon: Truck },
    { key: 'nearby', label: 'Nearby', icon: MapPin },
    { key: 'arrived', label: 'Arrived', icon: Navigation },
    { key: 'delivered', label: 'Delivered', icon: CheckCircle }
  ]

  const currentStepIndex = statusSteps.findIndex(s => s.key === tracking.status)

  return (
    <div className="space-y-6">
      {/* Status Timeline */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Delivery Status</h3>
        
        <div className="relative">
          {/* Progress Line */}
          <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gray-200"></div>
          <div 
            className="absolute left-6 top-8 w-0.5 bg-indigo-600 transition-all duration-500"
            style={{ height: `${(currentStepIndex / (statusSteps.length - 1)) * 100}%` }}
          ></div>

          {/* Steps */}
          <div className="relative space-y-8">
            {statusSteps.map((step, index) => {
              const Icon = step.icon
              const isCompleted = index <= currentStepIndex
              const isCurrent = index === currentStepIndex
              
              return (
                <div key={step.key} className="flex items-center gap-4">
                  <div className={`
                    relative z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all
                    ${isCompleted ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400'}
                    ${isCurrent ? 'ring-4 ring-indigo-100 scale-110' : ''}
                  `}>
                    <Icon className="w-6 h-6" />
                  </div>
                  
                  <div className="flex-1">
                    <p className={`font-medium ${isCompleted ? 'text-gray-900' : 'text-gray-500'}`}>
                      {step.label}
                    </p>
                    {tracking[`${step.key}_at`] && (
                      <p className="text-sm text-gray-500">
                        {new Date(tracking[`${step.key}_at`]).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>
                  
                  {isCurrent && (
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm font-medium rounded-full">
                      Current
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ETA Card */}
      {eta && ['in_transit', 'nearby'].includes(tracking.status) && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5" />
                <span className="text-sm font-medium opacity-90">Estimated Time</span>
              </div>
              <p className="text-3xl font-bold">{eta.etaText}</p>
              <p className="text-sm opacity-75 mt-1">
                Distance: {eta.distance} km
              </p>
            </div>
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
              <Truck className="w-10 h-10" />
            </div>
          </div>
        </div>
      )}

      {/* Delivery Person Info */}
      {tracking.delivery_person && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Person</h3>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden">
              {tracking.delivery_person.profile_photo_url ? (
                <img 
                  src={tracking.delivery_person.profile_photo_url} 
                  alt={tracking.delivery_person.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-indigo-600" />
              )}
            </div>
            
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{tracking.delivery_person.full_name}</p>
              
              {tracking.delivery_person.vehicle_type && (
                <p className="text-sm text-gray-600 capitalize">
                  {tracking.delivery_person.vehicle_type}
                  {tracking.delivery_person.vehicle_number && ` • ${tracking.delivery_person.vehicle_number}`}
                </p>
              )}
              
              {tracking.delivery_person.average_rating > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm text-gray-600">
                    {tracking.delivery_person.average_rating.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
            
            <a
              href={`tel:${tracking.delivery_person.phone}`}
              className="p-3 bg-green-600 text-white rounded-full hover:bg-green-700 transition"
            >
              <Phone className="w-5 h-5" />
            </a>
          </div>
        </div>
      )}

      {/* Delivery Notes */}
      {tracking.delivery_notes && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">Delivery Notes</p>
              <p className="text-sm text-blue-700 mt-1">{tracking.delivery_notes}</p>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Section */}
      {tracking.status === 'delivered' && !tracking.rating && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {!showFeedback ? (
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Order Delivered Successfully!
              </h3>
              <p className="text-gray-600 mb-4">
                How was your delivery experience?
              </p>
              <button
                onClick={() => setShowFeedback(true)}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                Rate Delivery
              </button>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Rate Your Experience</h3>
              
              {/* Star Rating */}
              <div className="flex items-center justify-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="p-1 transition"
                  >
                    <Star 
                      className={`w-10 h-10 ${
                        star <= rating 
                          ? 'text-yellow-400 fill-yellow-400' 
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              
              {/* Feedback Text */}
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Share your experience (optional)"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 mb-4"
              />
              
              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowFeedback(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitFeedback}
                  disabled={rating === 0}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                >
                  Submit Feedback
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Already Rated */}
      {tracking.status === 'delivered' && tracking.rating && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-900">Thank you for your feedback!</span>
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star 
                key={star}
                className={`w-4 h-4 ${
                  star <= tracking.rating 
                    ? 'text-yellow-400 fill-yellow-400' 
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          {tracking.feedback && (
            <p className="text-sm text-gray-600 mt-2">{tracking.feedback}</p>
          )}
        </div>
      )}
    </div>
  )
}

export default DeliveryTracking
