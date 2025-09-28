import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Only create client if credentials are provided
export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null

// Safe database operations with localStorage fallback
export const safeWrite = async (table: string, data: any) => {
  console.log(`🔄 Attempting to save to Supabase table '${table}':`, data)
  
  try {
    if (!supabase) throw new Error('Supabase not configured')
    
    const { data: result, error } = await supabase
      .from(table)
      .insert([data])
      .select()
    
    if (error) {
      console.error(`❌ Supabase insert error for ${table}:`, error)
      console.error(`Error details:`, {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      throw error
    }
    
    console.log(`✅ Successfully saved to Supabase: ${table}`, result[0])
    return result[0]
  } catch (error) {
    console.warn(`⚠️ Supabase failed, using localStorage for ${table}:`, error)
    
    // Fallback to localStorage
    const existing = JSON.parse(localStorage.getItem(table) || '[]')
    const newItem = { ...data, id: data.id || Date.now().toString() }
    existing.push(newItem)
    localStorage.setItem(table, JSON.stringify(existing))
    console.log(`💾 Saved to localStorage instead: ${table}`, newItem)
    return newItem
  }
}

export const safeRead = async (table: string) => {
  try {
    if (!supabase) throw new Error('Supabase not configured')
    
    const { data, error } = await supabase
      .from(table)
      .select('*')
    
    if (error) throw error
    console.log(`✅ Loaded from Supabase: ${table} (${data.length} items)`)
    return data
  } catch (error) {
    console.warn(`⚠️ Supabase failed, using localStorage for ${table}:`, error)
    return JSON.parse(localStorage.getItem(table) || '[]')
  }
}

export const safeUpdate = async (table: string, id: string, updates: any) => {
  try {
    if (!supabase) throw new Error('Supabase not configured')
    
    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', id)
      .select()
    
    if (error) throw error
    console.log(`✅ Updated in Supabase: ${table}`)
    return data[0]
  } catch (error) {
    console.warn(`⚠️ Supabase failed, using localStorage for ${table}:`, error)
    
    // Fallback to localStorage update
    const existing = JSON.parse(localStorage.getItem(table) || '[]')
    const updatedItems = existing.map((item: any) => 
      item.id === id ? { ...item, ...updates } : item
    )
    localStorage.setItem(table, JSON.stringify(updatedItems))
    return updatedItems.find((item: any) => item.id === id)
  }
}

export const safeDelete = async (table: string, id: string) => {
  try {
    if (!supabase) throw new Error('Supabase not configured')
    
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)
    
    if (error) throw error
    console.log(`✅ Deleted from Supabase: ${table}`)
    return true
  } catch (error) {
    console.warn(`⚠️ Supabase failed, using localStorage for ${table}:`, error)
    
    // Fallback to localStorage delete
    const existing = JSON.parse(localStorage.getItem(table) || '[]')
    const filteredItems = existing.filter((item: any) => item.id !== id)
    localStorage.setItem(table, JSON.stringify(filteredItems))
    return true
  }
}

// Fetch recent completed orders (last 20 orders or last 24 hours)
export const fetchRecentOrders = async () => {
  try {
    if (!supabase) throw new Error('Supabase not configured')
    
    const twentyFourHoursAgo = new Date()
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)
    
    const { data, error } = await supabase
      .from('completed_orders')
      .select('*')
      .gte('created_at', twentyFourHoursAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (error) throw error
    console.log(`✅ Loaded recent orders from Supabase: ${data.length} orders`)
    return data
  } catch (error) {
    console.warn('⚠️ Supabase failed, using localStorage for recent orders:', error)
    
    // Fallback to localStorage
    const allOrders = JSON.parse(localStorage.getItem('completed_orders') || '[]')
    const twentyFourHoursAgo = new Date()
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)
    
    return allOrders
      .filter((order: any) => new Date(order.created_at || order.timestamp) >= twentyFourHoursAgo)
      .sort((a: any, b: any) => new Date(b.created_at || b.timestamp).getTime() - new Date(a.created_at || a.timestamp).getTime())
      .slice(0, 20)
  }
}

// Reprint order function
export const reprintOrder = async (order: any, type: 'kot' | 'customer') => {
  console.log(`🖨️ Reprinting ${type.toUpperCase()} for order #${order.id.slice(-4)}`)
  
  // Convert Supabase order format back to Order format for printing
  const orderForPrint = {
    id: order.id,
    tableNumber: order.table_number,
    items: order.items,
    serviceCharge: order.service_charge || 0,
    parcelCharges: order.parcel_charges || 0,
    subtotal: order.subtotal,
    total: order.total,
    timestamp: new Date(order.timestamp),
    status: order.status,
    kotPrinted: order.kot_printed,
    customerBillPrinted: order.customer_bill_printed,
    billNumber: order.bill_number || 'N/A' // Handle legacy orders
  }
  
  return orderForPrint
}

// Test connection
export const testConnection = async () => {
  try {
    if (!supabase) {
      console.log('🔧 Supabase not configured - using localStorage mode')
      return false
    }
    
    const { error } = await supabase.from('menu_items').select('*').limit(1)
    if (error) throw error
    
    console.log('🎉 Supabase connected successfully!')
    return true
  } catch (error) {
    console.error('❌ Supabase connection failed:', error)
    return false
  }
}