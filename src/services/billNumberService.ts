import { supabase } from './supabase';

// Bill number service for daily sequential bill numbers
export class BillNumberService {
  private static readonly STORAGE_KEY_DATE = 'billDate';
  private static readonly STORAGE_KEY_COUNTER = 'billCounter';

  /**
   * Get the next bill number for today
   * Uses hybrid approach: Supabase primary, localStorage fallback
   */
  static async getNextBillNumber(): Promise<string> {
    const today = new Date().toISOString().split('T')[0]; // "2025-09-29"
    
    try {
      // Try Supabase first (most reliable)
      const billNumber = await this.getNextBillNumberFromSupabase(today);
      
      // Update localStorage as backup
      this.saveBillDataToLocalStorage(today, billNumber);
      
      return billNumber.toString().padStart(3, '0'); // "001", "002", etc.
    } catch (error) {
      console.warn('Supabase bill counter failed, using localStorage fallback:', error);
      
      // Fallback to localStorage
      const billNumber = this.getNextBillNumberFromLocalStorage(today);
      return billNumber.toString().padStart(3, '0');
    }
  }

  /**
   * Simple fallback that works without any database setup
   */
  static getSimpleBillNumber(): string {
    const today = new Date().toISOString().split('T')[0];
    const billNumber = this.getNextBillNumberFromLocalStorage(today);
    return billNumber.toString().padStart(3, '0');
  }

  /**
   * Get next bill number from Supabase using atomic function
   */
  private static async getNextBillNumberFromSupabase(date: string): Promise<number> {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    try {
      // Try using the stored procedure first
      const { data, error } = await supabase.rpc('increment_bill_counter', {
        date_param: date
      });

      if (error) throw error;
      return data as number;
    } catch (error) {
      // If stored procedure doesn't exist, use direct table operations
      console.warn('Stored procedure not found, using direct table operations');
      return await this.getNextBillNumberFromTable(date);
    }
  }

  /**
   * Fallback method using direct table operations
   */
  private static async getNextBillNumberFromTable(date: string): Promise<number> {
    if (!supabase) throw new Error('Supabase not configured');

    // Get current counter
    const { data: existing, error: selectError } = await supabase
      .from('daily_bill_counters')
      .select('last_bill_number')
      .eq('date', date)
      .single();

    let nextNumber = 1;
    if (!selectError && existing) {
      nextNumber = existing.last_bill_number + 1;
    }

    // Update or insert
    const { error: upsertError } = await supabase
      .from('daily_bill_counters')
      .upsert({
        date,
        last_bill_number: nextNumber,
        updated_at: new Date().toISOString()
      });

    if (upsertError) throw upsertError;
    return nextNumber;
  }

  /**
   * Get next bill number from localStorage (fallback)
   */
  private static getNextBillNumberFromLocalStorage(today: string): number {
    const storedDate = localStorage.getItem(this.STORAGE_KEY_DATE);
    let billCounter = parseInt(localStorage.getItem(this.STORAGE_KEY_COUNTER) || '0');

    if (storedDate !== today) {
      // New day - reset counter
      billCounter = 1;
      localStorage.setItem(this.STORAGE_KEY_DATE, today);
    } else {
      // Same day - increment counter
      billCounter += 1;
    }

    localStorage.setItem(this.STORAGE_KEY_COUNTER, billCounter.toString());
    return billCounter;
  }

  /**
   * Save bill data to localStorage for backup
   */
  private static saveBillDataToLocalStorage(date: string, billNumber: number): void {
    localStorage.setItem(this.STORAGE_KEY_DATE, date);
    localStorage.setItem(this.STORAGE_KEY_COUNTER, billNumber.toString());
  }

  /**
   * Get current bill counter for today (for display purposes)
   */
  static async getCurrentBillCounter(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      if (!supabase) {
        throw new Error('Supabase not configured');
      }

      const { data, error } = await supabase
        .from('daily_bill_counters')
        .select('last_bill_number')
        .eq('date', today)
        .single();

      if (error) {
        throw error;
      }

      return data?.last_bill_number || 0;
    } catch (error) {
      // Fallback to localStorage
      const storedDate = localStorage.getItem(this.STORAGE_KEY_DATE);
      if (storedDate === today) {
        return parseInt(localStorage.getItem(this.STORAGE_KEY_COUNTER) || '0');
      }
      return 0;
    }
  }

  /**
   * Format bill number with padding
   */
  static formatBillNumber(billNumber: number): string {
    return billNumber.toString().padStart(3, '0');
  }

  /**
   * Reset bill counter (admin function)
   */
  static async resetBillCounter(date?: string): Promise<void> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    try {
      if (supabase) {
        await supabase
          .from('daily_bill_counters')
          .upsert({
            date: targetDate,
            last_bill_number: 0,
            updated_at: new Date().toISOString()
          });
      }
      
      // Also reset localStorage if it's today
      const today = new Date().toISOString().split('T')[0];
      if (targetDate === today) {
        localStorage.setItem(this.STORAGE_KEY_DATE, today);
        localStorage.setItem(this.STORAGE_KEY_COUNTER, '0');
      }
    } catch (error) {
      console.error('Failed to reset bill counter:', error);
      throw error;
    }
  }
}