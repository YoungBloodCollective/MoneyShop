/**
 * Application Insights Telemetry Service for Frontend
 * Sends custom events to Azure Application Insights
 */

interface CustomEventProperties {
  [key: string]: string | number | boolean | undefined;
}

class AppInsightsService {
  private instrumentationKey: string | null = null;
  private isInitialized: boolean = false;

  /**
   * Initialize Application Insights with instrumentation key
   */
  initialize(instrumentationKey: string): void {
    if (this.isInitialized) {
      console.warn('[AppInsights] Already initialized');
      return;
    }

    this.instrumentationKey = instrumentationKey;
    this.isInitialized = true;
    console.log('[AppInsights] Initialized with key:', instrumentationKey.substring(0, 8) + '...');
  }

  /**
   * Track a custom event
   */
  trackEvent(eventName: string, properties?: CustomEventProperties): void {
    if (!this.isInitialized || !this.instrumentationKey) {
      console.warn('[AppInsights] Not initialized, event not sent:', eventName);
      return;
    }

    try {
      // For web platform, use Application Insights JavaScript SDK
      if (typeof globalThis !== 'undefined' && (globalThis as any).appInsights) {
        (globalThis as any).appInsights.trackEvent({
          name: eventName,
          properties: properties || {},
        });
        console.log('[AppInsights] Event tracked:', eventName, properties);
      } else {
        // Fallback: Send to backend endpoint that forwards to Application Insights
        this.sendEventToBackend(eventName, properties);
      }
    } catch (error) {
      console.error('[AppInsights] Error tracking event:', error);
    }
  }

  /**
   * Send event to backend endpoint (fallback method)
   */
  private async sendEventToBackend(
    eventName: string,
    properties?: CustomEventProperties,
  ): Promise<void> {
    try {
      const {apiClient} = await import('../api/apiClient');
      await apiClient.post('/api/telemetry/track-event', {
        eventName,
        properties: properties || {},
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[AppInsights] Error sending event to backend:', error);
    }
  }

  /**
   * Track page view
   */
  trackPageView(pageName: string, properties?: CustomEventProperties): void {
    this.trackEvent('PageView', {
      pageName,
      ...properties,
    });
  }

  /**
   * Track button click
   */
  trackButtonClick(buttonName: string, actionType?: string, additionalProperties?: CustomEventProperties): void {
    this.trackEvent('ButtonClick', {
      buttonName,
      actionType: actionType || 'click',
      ...additionalProperties,
    });
  }

  /**
   * Track error
   */
  trackError(error: Error, properties?: CustomEventProperties): void {
    if (!this.isInitialized || !this.instrumentationKey) {
      console.warn('[AppInsights] Not initialized, error not sent:', error.message);
      return;
    }

    try {
      if (typeof globalThis !== 'undefined' && (globalThis as any).appInsights) {
        (globalThis as any).appInsights.trackException({
          exception: error,
          properties: properties || {},
        });
      } else {
        this.sendErrorToBackend(error, properties);
      }
    } catch (err) {
      console.error('[AppInsights] Error tracking exception:', err);
    }
  }

  /**
   * Send error to backend endpoint (fallback method)
   */
  private async sendErrorToBackend(
    error: Error,
    properties?: CustomEventProperties,
  ): Promise<void> {
    try {
      const {apiClient} = await import('../api/apiClient');
      await apiClient.post('/api/telemetry/track-exception', {
        errorMessage: error.message,
        errorStack: error.stack,
        properties: properties || {},
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[AppInsights] Error sending exception to backend:', err);
    }
  }
}

export const appInsightsService = new AppInsightsService();

