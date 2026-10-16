import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const useCartStore = create((set, get) => ({
  items: [],
  customer: null,
  saleType: null, // null initially, 'retail' or 'wholesale' when selected
  paymentMethod: 'cash',
  discount: 0,
  loading: false,
  initialized: false,
  
  // Load cart from database for authenticated customer
  loadCart: async (customerId) => {
    if (!customerId) {
      console.log('⚠️ No customer ID provided, skipping cart load')
      set({ items: [], initialized: true })
      return
    }

    set({ loading: true })
    
    try {
      console.log('📦 Loading cart for customer:', customerId)
      
      // Fetch cart items with medicine and batch details
      const { data: cartItems, error } = await supabase
        .from('customer_cart_items')
        .select(`
          id,
          medicine_id,
          batch_id,
          quantity,
          free_quantity,
          medicines!inner (
            id,
            name,
            generic_name,
            manufacturer,
            mrp,
            gst_percentage,
            prescription_required,
            schedule
          ),
          medicine_batches!inner (
            id,
            batch_number,
            expiry_date,
            selling_price,
            wholesale_price,
            mrp,
            current_quantity
          )
        `)
        .eq('customer_id', customerId)

      if (error) {
        console.error('❌ Error loading cart:', error)
        set({ items: [], loading: false, initialized: true })
        return
      }

      if (!cartItems || cartItems.length === 0) {
        console.log('📭 Cart is empty')
        set({ items: [], loading: false, initialized: true })
        return
      }

      // Transform to cart format, filtering out invalid items
      const validItems = cartItems
        .filter(item => {
          // Check if medicine and batch exist
          if (!item.medicines || !item.medicine_batches) {
            console.warn('⚠️ Skipping cart item with missing medicine/batch data')
            return false
          }
          
          // Check if batch is expired
          if (new Date(item.medicine_batches.expiry_date) <= new Date()) {
            console.warn('⚠️ Skipping expired batch:', item.medicine_batches.batch_number)
            return false
          }
          
          // Check if batch has stock
          if (item.medicine_batches.current_quantity <= 0) {
            console.warn('⚠️ Skipping out-of-stock batch:', item.medicine_batches.batch_number)
            return false
          }
          
          return true
        })
        .map(item => ({
          id: `${item.medicine_id}-${item.batch_id}`,
          medicine: item.medicines,
          batch: item.medicine_batches,
          quantity: item.quantity,
          freeQuantity: item.free_quantity || 0,
          price: item.medicine_batches.selling_price,
          discount: 0
        }))

      console.log(`✅ Loaded ${validItems.length} valid cart items`)
      set({ items: validItems, loading: false, initialized: true })
      
    } catch (error) {
      console.error('❌ Error loading cart:', error)
      set({ items: [], loading: false, initialized: true })
    }
  },

  // Save cart item to database
  saveCartItem: async (customerId, medicine, batch, quantity, freeQuantity = 0) => {
    if (!customerId) {
      console.warn('⚠️ No customer ID, cannot persist cart item')
      return
    }

    try {
      // Upsert cart item
      const { error } = await supabase
        .from('customer_cart_items')
        .upsert({
          customer_id: customerId,
          medicine_id: medicine.id,
          batch_id: batch.id,
          quantity,
          free_quantity: freeQuantity
        }, {
          onConflict: 'customer_id,medicine_id,batch_id'
        })

      if (error) {
        console.error('❌ Error saving cart item:', error)
      } else {
        console.log('✅ Cart item saved to database')
      }
    } catch (error) {
      console.error('❌ Error saving cart item:', error)
    }
  },

  // Remove cart item from database
  removeCartItem: async (customerId, medicineId, batchId) => {
    if (!customerId) return

    try {
      const { error } = await supabase
        .from('customer_cart_items')
        .delete()
        .eq('customer_id', customerId)
        .eq('medicine_id', medicineId)
        .eq('batch_id', batchId)

      if (error) {
        console.error('❌ Error removing cart item:', error)
      } else {
        console.log('✅ Cart item removed from database')
      }
    } catch (error) {
      console.error('❌ Error removing cart item:', error)
    }
  },

  // Clear all cart items from database
  clearCartInDatabase: async (customerId) => {
    if (!customerId) return

    try {
      const { error } = await supabase
        .from('customer_cart_items')
        .delete()
        .eq('customer_id', customerId)

      if (error) {
        console.error('❌ Error clearing cart from database:', error)
      } else {
        console.log('✅ Cart cleared from database')
      }
    } catch (error) {
      console.error('❌ Error clearing cart from database:', error)
    }
  },

  // Add item to cart
  addItem: async (medicine, batch, quantity, freeQuantity = 0, customerId = null) => {
    const items = get().items
    const existingItemIndex = items.findIndex(
      item => item.medicine.id === medicine.id && item.batch.id === batch.id
    )
    
    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedItems = [...items]
      updatedItems[existingItemIndex] = {
        ...updatedItems[existingItemIndex],
        quantity: updatedItems[existingItemIndex].quantity + quantity,
        freeQuantity: updatedItems[existingItemIndex].freeQuantity + freeQuantity
      }
      set({ items: updatedItems })
      
      // Save to database
      if (customerId) {
        await get().saveCartItem(
          customerId,
          medicine,
          batch,
          updatedItems[existingItemIndex].quantity,
          updatedItems[existingItemIndex].freeQuantity
        )
      }
    } else {
      // Add new item
      const saleType = get().saleType
      const newItem = {
        id: `${medicine.id}-${batch.id}`,
        medicine,
        batch,
        quantity,
        freeQuantity,
        price: saleType === 'wholesale' ? batch.wholesale_price : batch.selling_price,
        discount: 0
      }
      set({ items: [...items, newItem] })
      
      // Save to database
      if (customerId) {
        await get().saveCartItem(customerId, medicine, batch, quantity, freeQuantity)
      }
    }
  },

  // Update item quantity
  updateItemQuantity: async (itemId, quantity, freeQuantity = 0, customerId = null) => {
    const items = get().items
    const item = items.find(item => item.id === itemId)
    
    const updatedItems = items.map(item => 
      item.id === itemId ? { ...item, quantity, freeQuantity } : item
    )
    set({ items: updatedItems })
    
    // Save to database
    if (customerId && item) {
      await get().saveCartItem(
        customerId,
        item.medicine,
        item.batch,
        quantity,
        freeQuantity
      )
    }
  },

  // Update item discount
  updateItemDiscount: (itemId, discount) => {
    const items = get().items
    const updatedItems = items.map(item => 
      item.id === itemId ? { ...item, discount } : item
    )
    set({ items: updatedItems })
  },

  // Remove item from cart
  removeItem: async (itemId, customerId = null) => {
    const items = get().items
    const item = items.find(item => item.id === itemId)
    
    const updatedItems = items.filter(item => item.id !== itemId)
    set({ items: updatedItems })
    
    // Remove from database
    if (customerId && item) {
      await get().removeCartItem(customerId, item.medicine.id, item.batch.id)
    }
  },

  // Set customer
  setCustomer: (customer) => set({ customer }),

  // Set sale type
  setSaleType: (saleType) => {
    set({ saleType })
    // Update prices when sale type changes
    const items = get().items.map(item => ({
      ...item,
      price: saleType === 'retail' ? item.batch.selling_price : item.batch.wholesale_price
    }))
    set({ items })
  },

  // Set payment method
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),

  // Set discount
  setDiscount: (discount) => set({ discount }),

  // Calculate subtotal
  getSubtotal: () => {
    const items = get().items
    return items.reduce((total, item) => {
      const itemTotal = item.quantity * item.price
      const itemDiscount = (itemTotal * item.discount) / 100
      return total + (itemTotal - itemDiscount)
    }, 0)
  },

  // Calculate GST
  getGST: () => {
    const items = get().items
    return items.reduce((total, item) => {
      const itemTotal = item.quantity * item.price
      const itemDiscount = (itemTotal * item.discount) / 100
      const taxableAmount = itemTotal - itemDiscount
      return total + (taxableAmount * item.medicine.gst_percentage) / 100
    }, 0)
  },

  // Calculate total discount amount
  getTotalDiscount: () => {
    const items = get().items
    const itemDiscounts = items.reduce((total, item) => {
      const itemTotal = item.quantity * item.price
      return total + (itemTotal * item.discount) / 100
    }, 0)
    
    const subtotal = get().getSubtotal() + itemDiscounts
    const cartDiscount = (subtotal * get().discount) / 100
    
    return itemDiscounts + cartDiscount
  },

  // Calculate grand total
  getGrandTotal: () => {
    const subtotal = get().getSubtotal()
    const gst = get().getGST()
    const cartDiscount = (subtotal * get().discount) / 100
    return subtotal + gst - cartDiscount
  },

  // Get total items count
  getItemsCount: () => {
    return get().items.reduce((total, item) => total + item.quantity, 0)
  },

  // Clear cart
  clearCart: async (customerId = null) => {
    // Clear from database first
    if (customerId) {
      await get().clearCartInDatabase(customerId)
    }
    
    // Clear local state
    set({ 
      items: [], 
      customer: null,
      saleType: null, // Reset to no selection
      discount: 0 
    })
  },

  // Validate cart
  validateCart: () => {
    const { items, saleType, customer } = get()
    const errors = []

    if (items.length === 0) {
      errors.push('Cart is empty')
    }

    // Check stock availability
    items.forEach(item => {
      if (item.quantity + item.freeQuantity > item.batch.current_quantity) {
        errors.push(`Insufficient stock for ${item.medicine.name}`)
      }
      
      // Check expiry
      if (new Date(item.batch.expiry_date) <= new Date()) {
        errors.push(`${item.medicine.name} batch has expired`)
      }
    })

    // Validate wholesale requirements
    if (saleType === 'wholesale') {
      if (!customer) {
        errors.push('Customer is required for wholesale billing')
      } else if (!customer.gstin) {
        errors.push('GSTIN is required for wholesale billing')
      } else if (!customer.drug_license_number) {
        errors.push('Drug License Number is required for wholesale billing')
      }
    }

    return errors
  }
}))

export default useCartStore