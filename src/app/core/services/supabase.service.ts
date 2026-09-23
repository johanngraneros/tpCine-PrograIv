import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({  
  providedIn: 'root'
})
export class Supabase {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(environment.supabase.Url, environment.supabase.Key);
  }

  get instance(): SupabaseClient {
    return this.client;
  }
}