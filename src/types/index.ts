export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      order_status_history: {
        Row: {
          id: string
          order_id: string
          status: string | null
          new_status: string | null
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          status?: string | null
          new_status?: string | null
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          status?: string | null
          new_status?: string | null
          note?: string | null
          created_at?: string
        }
        Relationships: []
      }
      addresses: {
        Row: {
          city: string | null
          full_name: string | null
          governorate: string | null
          id: string
          is_default: boolean | null
          label: string
          line1: string | null
          phone: string | null
          postal_code: string | null
          user_id: string | null
        }
        Insert: {
          city?: string | null
          full_name?: string | null
          governorate?: string | null
          id?: string
          is_default?: boolean | null
          label: string
          line1?: string | null
          phone?: string | null
          postal_code?: string | null
          user_id?: string | null
        }
        Update: {
          city?: string | null
          full_name?: string | null
          governorate?: string | null
          id?: string
          is_default?: boolean | null
          label?: string
          line1?: string | null
          phone?: string | null
          postal_code?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      attribute_values: {
        Row: {
          attribute_id: string | null
          color_hex: string | null
          id: string
          position: number | null
          value: string
        }
        Insert: {
          attribute_id?: string | null
          color_hex?: string | null
          id?: string
          position?: number | null
          value: string
        }
        Update: {
          attribute_id?: string | null
          color_hex?: string | null
          id?: string
          position?: number | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
        ]
      }
      attributes: {
        Row: {
          display_type: string | null
          id: string
          name: string
        }
        Insert: {
          display_type?: string | null
          id?: string
          name: string
        }
        Update: {
          display_type?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          id: string
          title: string | null
          subtitle: string | null
          image_url: string
          link_url: string | null
          position: number
          is_active: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          title?: string | null
          subtitle?: string | null
          image_url: string
          link_url?: string | null
          position?: number
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          title?: string | null
          subtitle?: string | null
          image_url?: string
          link_url?: string | null
          position?: number
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      banner_products: {
        Row: {
          banner_id: string
          product_id: string
          position: number
        }
        Insert: {
          banner_id: string
          product_id: string
          position?: number
        }
        Update: {
          banner_id?: string
          product_id?: string
          position?: number
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          added_at: string | null
          cart_id: string | null
          id: string
          product_id: string | null
          quantity: number
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          added_at?: string | null
          cart_id?: string | null
          id?: string
          product_id?: string | null
          quantity?: number
          unit_price: number
          variant_id?: string | null
        }
        Update: {
          added_at?: string | null
          cart_id?: string | null
          id?: string
          product_id?: string | null
          quantity?: number
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          created_at: string | null
          id: string
          session_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          session_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          session_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          parent_id: string | null
          slug: string
          subcategories_count: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          parent_id?: string | null
          slug: string
          subcategories_count?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          parent_id?: string | null
          slug?: string
          subcategories_count?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_usages: {
        Row: {
          coupon_id: string | null
          id: string
          order_id: string | null
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          coupon_id?: string | null
          id?: string
          order_id?: string | null
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          coupon_id?: string | null
          id?: string
          order_id?: string | null
          used_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usages_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_coupon_usage_order"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          discount_type: string | null
          discount_value: number | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          max_uses_per_user: number | null
          min_order_amount: number | null
          starts_at: string | null
          used_count: number | null
        }
        Insert: {
          code: string
          discount_type?: string | null
          discount_value?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          max_uses_per_user?: number | null
          min_order_amount?: number | null
          starts_at?: string | null
          used_count?: number | null
        }
        Update: {
          code?: string
          discount_type?: string | null
          discount_value?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          max_uses_per_user?: number | null
          min_order_amount?: number | null
          starts_at?: string | null
          used_count?: number | null
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          email: string
          id: string
          is_active: boolean | null
          subscribed_at: string | null
        }
        Insert: {
          email: string
          id?: string
          is_active?: boolean | null
          subscribed_at?: string | null
        }
        Update: {
          email?: string
          id?: string
          is_active?: boolean | null
          subscribed_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          type: string
          title: string
          body: string | null
          link: string | null
          is_read: boolean
          created_at: string | null
        }
        Insert: {
          id?: string
          type: string
          title: string
          body?: string | null
          link?: string | null
          is_read?: boolean
          created_at?: string | null
        }
        Update: {
          id?: string
          type?: string
          title?: string
          body?: string | null
          link?: string | null
          is_read?: boolean
          created_at?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string | null
          product_id: string | null
          product_name: string
          quantity: number
          sku: string | null
          total: number
          unit_price: number
          variant_id: string | null
          variant_label: string | null
        }
        Insert: {
          id?: string
          order_id?: string | null
          product_id?: string | null
          product_name: string
          quantity: number
          sku?: string | null
          total: number
          unit_price: number
          variant_id?: string | null
          variant_label?: string | null
        }
        Update: {
          id?: string
          order_id?: string | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          sku?: string | null
          total?: number
          unit_price?: number
          variant_id?: string | null
          variant_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_address: Json | null
          coupon_id: string | null
          created_at: string | null
          discount_amount: number | null
          id: string
          idempotency_key: string | null
          notes: string | null
          order_number: string
          payment_method: string | null
          payment_status: string | null
          shipping_address: Json | null
          shipping_amount: number | null
          status: string | null
          subtotal: number
          total: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          billing_address?: Json | null
          coupon_id?: string | null
          created_at?: string | null
          discount_amount?: number | null
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          order_number?: string
          payment_method?: string | null
          payment_status?: string | null
          shipping_address?: Json | null
          shipping_amount?: number | null
          status?: string | null
          subtotal: number
          total: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          billing_address?: Json | null
          coupon_id?: string | null
          created_at?: string | null
          discount_amount?: number | null
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          order_number?: string
          payment_method?: string | null
          payment_status?: string | null
          shipping_address?: Json | null
          shipping_amount?: number | null
          status?: string | null
          subtotal?: number
          total?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      product_attributes: {
        Row: {
          attribute_id: string
          product_id: string
        }
        Insert: {
          attribute_id: string
          product_id: string
        }
        Update: {
          attribute_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_attributes_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_attributes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          id: string
          is_main: boolean | null
          position: number | null
          product_id: string | null
          url: string
        }
        Insert: {
          id?: string
          is_main?: boolean | null
          position?: number | null
          product_id?: string | null
          url: string
        }
        Update: {
          id?: string
          is_main?: boolean | null
          position?: number | null
          product_id?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          compare_at_price: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          position: number | null
          price: number
          product_id: string | null
          sku: string | null
          stock_quantity: number | null
        }
        Insert: {
          compare_at_price?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          position?: number | null
          price: number
          product_id?: string | null
          sku?: string | null
          stock_quantity?: number | null
        }
        Update: {
          compare_at_price?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          position?: number | null
          price?: number
          product_id?: string | null
          sku?: string | null
          stock_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_price: number
          brand: string | null
          category_id: string | null
          cost_price: number | null
          created_at: string | null
          description: string | null
          has_variants: boolean | null
          id: string
          is_active: boolean | null
          is_new: boolean | null
          meta_description: string | null
          meta_title: string | null
          name: string
          search_vector: unknown
          short_description: string | null
          sku: string | null
          slug: string
          stock_quantity: number | null
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          base_price: number
          brand?: string | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          has_variants?: boolean | null
          id?: string
          is_active?: boolean | null
          is_new?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          search_vector?: unknown
          short_description?: string | null
          sku?: string | null
          slug: string
          stock_quantity?: number | null
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          base_price?: number
          brand?: string | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          has_variants?: boolean | null
          id?: string
          is_active?: boolean | null
          is_new?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          search_vector?: unknown
          short_description?: string | null
          sku?: string | null
          slug?: string
          stock_quantity?: number | null
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          newsletter_opt_in: boolean | null
          phone: string | null
          role: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          newsletter_opt_in?: boolean | null
          phone?: string | null
          role?: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          newsletter_opt_in?: boolean | null
          phone?: string | null
          role?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          discount_type: string | null
          discount_value: number
          ends_at: string | null
          id: string
          is_active: boolean | null
          product_id: string | null
          starts_at: string | null
          variant_id: string | null
        }
        Insert: {
          discount_type?: string | null
          discount_value: number
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          product_id?: string | null
          starts_at?: string | null
          variant_id?: string | null
        }
        Update: {
          discount_type?: string | null
          discount_value?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          product_id?: string | null
          starts_at?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          is_approved: boolean | null
          product_id: string | null
          rating: number
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          is_approved?: boolean | null
          product_id?: string | null
          rating: number
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          is_approved?: boolean | null
          product_id?: string | null
          rating?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          address: string | null
          email: string | null
          facebook_url: string | null
          id: string
          instagram_url: string | null
          phone: string | null
          tiktok_url: string | null
          updated_at: string
          whatsapp_url: string | null
          shipping_price: number
        }
        Insert: {
          address?: string | null
          email?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          phone?: string | null
          tiktok_url?: string | null
          updated_at?: string
          whatsapp_url?: string | null
          shipping_price?: number
        }
        Update: {
          address?: string | null
          email?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          phone?: string | null
          tiktok_url?: string | null
          updated_at?: string
          whatsapp_url?: string | null
          shipping_price?: number
        }
        Relationships: []
      }
      variant_attribute_values: {
        Row: {
          attribute_value_id: string
          variant_id: string
        }
        Insert: {
          attribute_value_id: string
          variant_id: string
        }
        Update: {
          attribute_value_id?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "variant_attribute_values_attribute_value_id_fkey"
            columns: ["attribute_value_id"]
            isOneToOne: false
            referencedRelation: "attribute_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variant_attribute_values_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      variant_images: {
        Row: {
          id: string
          position: number | null
          url: string
          variant_id: string | null
        }
        Insert: {
          id?: string
          position?: number | null
          url: string
          variant_id?: string | null
        }
        Update: {
          id?: string
          position?: number | null
          url?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "variant_images_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlists: {
        Row: {
          created_at: string | null
          id: string
          product_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_admin_dashboard_kpis: {
        Args: { p_days?: number; p_end_date?: string }
        Returns: {
          customers: number
          orders: number
          revenue: number
          average_basket: number
          customers_delta_percent: number | null
          orders_delta_percent: number | null
          revenue_delta_percent: number | null
          average_basket_delta_percent: number | null
        }
      }
      get_admin_monthly_sales: {
          Args: { p_days?: number; p_end_date?: string }
          Returns: Array<{
            month: string
            total: number
          }>
      }
        get_admin_low_stock_products: {
          Args: { p_limit?: number }
          Returns: Json
        }
        get_admin_recent_orders: {
          Args: { p_limit?: number }
          Returns: Json
        }
      get_admin_customers_list: {
          Args: never
          Returns: Json
        }
      is_admin: { Args: never; Returns: boolean }
      create_order: {
        Args: {
          p_items: Json
          p_governorate: string
          p_shipping_address: Json
          p_coupon_code?: string | null
          p_notes?: string | null
          p_idempotency_key?: string | null
        }
        Returns: Json
      }
      validate_coupon: {
        Args: { p_code: string; p_subtotal: number }
        Returns: Json
      }
      admin_update_order_status: {
        Args: {
          p_order_id: string
          p_new_status: string
          p_note?: string | null
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience frontend types used across the app
export type ProductImage = {
  id: string
  product_id: string
  url: string
  alt: string
  position: number
  is_main?: boolean
  variant_value: string | null
  file?: File
}

export type ProductAttribute = {
  id: string
  name: string
  code: string
  type: 'swatch' | 'button' | 'image'
  values: { id: string; label: string; hex?: string; image_url?: string }[]
}

export type ProductVariant = {
  id: string
  product_id: string
  sku: string
  // keyed by the REAL attribute id (attributes.id) -> the chosen attribute_values.id
  options: Record<string, string>
  price: number
  cost_price?: number | null
  compare_at_price: number | null
  promo_percent?: number | null
  price_after_promo?: number | null
  stock: number
  position?: number
}

export type Product = {
  id: string
  name: string
  slug: string
  brand: string
  category_id: string | null
  short_description: string
  description: string
  price: number
  cost_price?: number | null
  compare_at_price: number | null
  promo_percent?: number | null
  price_after_promo?: number | null
  stock: number
  sku: string
  is_active: boolean
  is_new: boolean
  rating: number
  reviews_count: number
  created_at: string
  images: ProductImage[]
  attributes: ProductAttribute[]
  variants: ProductVariant[]
  tags: string[]
}

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export type OrderItem = {
  id: string
  product_id: string | null
  variant_id: string | null
  name: string
  sku?: string | null
  variant_label: string | null
  image: string | null
  unit_price: number
  quantity: number
}

export type Order = {
  id: string
  order_number?: string
  reference: string
  customer_name: string
  customer_email?: string
  customer_phone: string
  address_line?: string
  city?: string
  postal_code?: string
  status: OrderStatus
  payment_method?: string
  subtotal: number
  shipping: number
  discount: number
  total: number
  notes?: string | null
  governorate: string
  created_at: string | null
  items: OrderItem[]
}

export type Category = {
  id: string
  parent_id: string | null
  name: string
  slug: string
  description?: string | null
  image_url?: string | null
  subcategories_count?: number
  created_at?: string
  updated_at?: string
}

export type CategoryNode = Category & {
  children: CategoryNode[]
}

export type Address = {
  id: string
  label: string
  full_name: string
  phone: string
  line1: string
  city: string
  governorate: string
  postal_code: string
  is_default: boolean
}

export type CartItem = {
  key: string
  product_id: string
  variant_id: string | null
  slug: string
  name: string
  variant_label: string | null
  image: string
  unit_price: number
  compare_at_price: number | null
  max_stock: number
  quantity: number
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const