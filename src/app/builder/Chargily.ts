import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import config from '../config';

/**
 * Chargily Pay v2 API client
 * Docs: https://dev.chargily.com/pay-v2/api-reference/introduction
 *
 * NOTE: As of the current official API reference, Chargily Pay v2 does NOT
 * expose a "refund" endpoint. Available resources are: Balance, Customers,
 * Products, Prices, Checkouts (create/retrieve/list/items/expire), Payment Links.
 * The `refundCheckout` method below throws on purpose so nobody accidentally
 * ships code assuming refunds work — remove/replace once/if Chargily adds it.
 */

const BASE_URLS = {
  test: 'https://pay.chargily.net/test/api/v2',
  live: 'https://pay.chargily.net/api/v2',
} as const;

export type ChargilyMode = 'test' | 'live';

export interface ChargilyClientOptions {
  apiKey: string; // your API Secret Key
  mode?: ChargilyMode; // defaults to 'test'
}

export interface CheckoutItemByPrice {
  price: string; // Price object ID
  quantity: number;
}

export interface CreateCheckoutParams {
  // Provide EITHER items OR (amount + currency), not both
  items?: CheckoutItemByPrice[];
  amount?: number;
  currency?: 'dzd' | 'usd' | 'eur';

  payment_method?: 'edahabia' | 'cib' | 'chargily_app';
  success_url: string;
  failure_url?: string;
  webhook_endpoint?: string;
  customer_id?: string;
  description?: string;
  locale?: 'ar' | 'en' | 'fr';
  chargily_pay_fees_allocation?: 'customer' | 'merchant' | 'split';
  shipping_address?: string;
  collect_shipping_address?: boolean;
  percentage_discount?: number; // prohibited together with amount_discount
  amount_discount?: number; // prohibited together with percentage_discount
  metadata?: Record<string, unknown>[];
}

export interface ChargilyCheckout {
  id: string;
  entity: 'checkout';
  livemode: boolean;
  amount: number;
  currency: string;
  fees: number;
  fees_on_merchant: number;
  fees_on_customer: number;
  chargily_pay_fees_allocation: 'customer' | 'merchant' | 'split';
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'canceled';
  locale: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  success_url: string;
  failure_url: string | null;
  webhook_endpoint: string | null;
  payment_method: string | null;
  invoice_id: string | null;
  customer_id: string | null;
  payment_link_id: string | null;
  created_at: number;
  updated_at: number;
  shipping_address: string | null;
  collect_shipping_address: number;
  discount: { type: 'percentage' | 'amount'; value: number } | null;
  amount_without_discount: number;
  checkout_url: string;
  qr_code_url?: string; // present when payment_method === 'chargily_app'
}

export interface CreateCustomerParams {
  name: string;
  email?: string;
  phone?: string;
  address?: {
    country?: string; // e.g. "Algeria"
    state?: string;
    address?: string;
  };
  metadata?: Record<string, unknown>[];
}

export interface ChargilyCustomer {
  id: string;
  entity: 'customer';
  livemode: boolean;
  name: string;
  email: string | null;
  phone: string | null;
  address: {
    country: string | null;
    state: string | null;
    address: string | null;
  } | null;
  metadata: Record<string, unknown> | null;
  created_at: number;
  updated_at: number;
}

export interface PaginatedList<T> {
  livemode: boolean;
  data: T[];
  has_more?: boolean;
  [key: string]: unknown;
}

export class ChargilyApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ChargilyApiError';
    this.status = status;
    this.body = body;
  }
}

export class ChargilyClient {
  private http: AxiosInstance;

  constructor(options: ChargilyClientOptions) {
    const mode = options.mode ?? 'test';

    this.http = axios.create({
      baseURL: BASE_URLS[mode],
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    this.http.interceptors.response.use(
      res => res,
      err => {
        const status = err?.response?.status ?? 0;
        const body = err?.response?.data ?? null;
        const message =
          body?.message ?? err?.message ?? 'Chargily API request failed';
        throw new ChargilyApiError(message, status, body);
      },
    );
  }

  // ---------------------------------------------------------------------
  // Checkouts
  // ---------------------------------------------------------------------

  async createCheckout(
    params: CreateCheckoutParams,
  ): Promise<ChargilyCheckout> {
    this.assertValidCheckoutParams(params);
    const { data } = await this.http.post<ChargilyCheckout>(
      '/checkouts',
      params,
    );
    return data;
  }

  async retrieveCheckout(checkoutId: string): Promise<ChargilyCheckout> {
    const { data } = await this.http.get<ChargilyCheckout>(
      `/checkouts/${checkoutId}`,
    );
    return data;
  }

  async listCheckouts(query?: {
    page?: number;
    per_page?: number;
    customer_id?: string;
    status?: ChargilyCheckout['status'];
  }): Promise<PaginatedList<ChargilyCheckout>> {
    const { data } = await this.http.get<PaginatedList<ChargilyCheckout>>(
      '/checkouts',
      {
        params: query,
      },
    );
    return data;
  }

  async retrieveCheckoutItems(
    checkoutId: string,
  ): Promise<PaginatedList<unknown>> {
    const { data } = await this.http.get(`/checkouts/${checkoutId}/items`);
    return data;
  }

  async expireCheckout(checkoutId: string): Promise<ChargilyCheckout> {
    const { data } = await this.http.post<ChargilyCheckout>(
      `/checkouts/${checkoutId}/expire`,
    );
    return data;
  }

  // ---------------------------------------------------------------------
  // Payment verification
  // ---------------------------------------------------------------------

  /**
   * Poll-based verification: fetch the checkout and inspect `status`.
   * Use this right after redirect back to your success_url, or from a
   * background job. For real-time confirmation, prefer webhooks below.
   */
  async verifyPayment(checkoutId: string): Promise<
    | {
        paid: boolean;
        status: ChargilyCheckout['status'];
        checkout: ChargilyCheckout;
      }
    | any
  > {
    try {
      const checkout = await this.retrieveCheckout(checkoutId);
      return {
        paid: checkout.status === 'paid',
        status: checkout.status,
        checkout,
      };
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Verifies the `signature` header Chargily sends on webhook requests.
   * Chargily signs the raw request body with HMAC-SHA256 using your API
   * *secret* key. Pass the RAW (unparsed) request body string here —
   * not the parsed JSON — or the signature check will fail.
   */
  verifyWebhookSignature(
    rawBody: string,
    signatureHeader: string,
    apiSecretKey: string,
  ): boolean {
    const computed = crypto
      .createHmac('sha256', apiSecretKey)
      .update(rawBody)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(computed, 'hex'),
        Buffer.from(signatureHeader, 'hex'),
      );
    } catch {
      // length mismatch etc.
      return false;
    }
  }

  // ---------------------------------------------------------------------
  // Refunds — NOT SUPPORTED by Chargily Pay v2 as of now
  // ---------------------------------------------------------------------

  /**
   * Chargily Pay v2's public API reference currently has no refund
   * endpoint. This stub exists so the shape of your service layer is
   * ready to wire up the day they ship one — for now it throws.
   * If you need to refund a customer today, it has to be done manually
   * from the Chargily dashboard / by contacting their support.
   */
  async refundCheckout(_checkoutId: string, _amount?: number): Promise<never> {
    throw new Error(
      'Chargily Pay v2 does not currently expose a refund API endpoint. ' +
        'Refunds must be processed manually from the Chargily dashboard.',
    );
  }

  // ---------------------------------------------------------------------
  // Customers
  // ---------------------------------------------------------------------

  async createCustomer(
    params: CreateCustomerParams,
  ): Promise<ChargilyCustomer> {
    const { data } = await this.http.post<ChargilyCustomer>(
      '/customers',
      params,
    );
    return data;
  }

  async retrieveCustomer(customerId: string): Promise<ChargilyCustomer> {
    const { data } = await this.http.get<ChargilyCustomer>(
      `/customers/${customerId}`,
    );
    return data;
  }

  async listCustomers(query?: {
    page?: number;
    per_page?: number;
  }): Promise<PaginatedList<ChargilyCustomer>> {
    const { data } = await this.http.get<PaginatedList<ChargilyCustomer>>(
      '/customers',
      {
        params: query,
      },
    );
    return data;
  }

  async updateCustomer(
    customerId: string,
    params: Partial<CreateCustomerParams>,
  ): Promise<ChargilyCustomer> {
    const { data } = await this.http.post<ChargilyCustomer>(
      `/customers/${customerId}`,
      params,
    );
    return data;
  }

  async deleteCustomer(customerId: string): Promise<void> {
    await this.http.delete(`/customers/${customerId}`);
  }

  // ---------------------------------------------------------------------
  // internal helpers
  // ---------------------------------------------------------------------

  private assertValidCheckoutParams(params: CreateCheckoutParams) {
    const hasItems = !!params.items?.length;
    const hasAmount = params.amount !== undefined;

    if (hasItems && hasAmount) {
      throw new Error(
        'createCheckout: provide either `items` OR `amount`+`currency`, not both.',
      );
    }
    if (!hasItems && !hasAmount) {
      throw new Error(
        'createCheckout: you must provide either `items` or `amount`.',
      );
    }
    if (hasAmount && !params.currency) {
      throw new Error(
        'createCheckout: `currency` is required when `amount` is provided.',
      );
    }
    if (
      params.percentage_discount !== undefined &&
      params.amount_discount !== undefined
    ) {
      throw new Error(
        'createCheckout: `percentage_discount` and `amount_discount` are mutually exclusive.',
      );
    }
    if (!params.success_url) {
      throw new Error('createCheckout: `success_url` is required.');
    }
  }
}

const ChargilyService = new ChargilyClient({
  apiKey: config?.chargily.chargily_secret_key!,
  mode: config?.chargily.chargily_mode as 'live' | 'test', // 'live' in production
});

export default ChargilyService;
