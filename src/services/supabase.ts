import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Only create client if credentials are provided
export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null

// Safe database operations with localStorage fallback
export const safeWrite = async (table: string, data: any) => {
  try {
    if (!supabase) throw new Error('Supabase not configured')
    
    const { data: result, error } = await supabase
      .from(table)
      .insert([data])
      .select()
    
    if (error) throw error
    console.log(`✅ Saved to Supabase: ${table}`)
    return result[0]
  } catch (error) {
    console.warn(`⚠️ Supabase failed, using localStorage for ${table}:`, error)
    
    // Fallback to localStorage
    const existing = JSON.parse(localStorage.getItem(table) || '[]')
    const newItem = { ...data, id: data.id || Date.now().toString() }
    existing.push(newItem)
    localStorage.setItem(table, JSON.stringify(existing))
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