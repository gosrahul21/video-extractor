/**
 * Classify internal pipeline errors into systematic, frontend-friendly error objects.
 */
export const classifyJobError = (err) => {
  const rawMessage = err?.message || String(err || '');
  const stage = err?.stage || 'unknown';
  const statusCode = err?.status || err?.statusCode || null;

  // 1. Upstream Gemini / HTTP capacity & rate-limit errors
  if (
    statusCode === 503 ||
    /503 Service Unavailable|high demand|overloaded/i.test(rawMessage)
  ) {
    return {
      code: 'AI_SERVICE_UNAVAILABLE',
      stage,
      message: 'Our AI service is temporarily experiencing high demand. Please try again in a few moments.',
      retryable: true,
      ...(statusCode ? { statusCode } : {})
    };
  }

  if (
    statusCode === 429 ||
    /429|quota|rate limit|RESOURCE_EXHAUSTED/i.test(rawMessage)
  ) {
    return {
      code: 'AI_RATE_LIMITED',
      stage,
      message: 'Too many requests right now. Please wait a moment and try again.',
      retryable: true,
      ...(statusCode ? { statusCode } : {})
    };
  }

  if ((stage === 'upload' || stage === 'extract') && (statusCode === 401 || statusCode === 403)) {
    return {
      code: 'AI_AUTH_ERROR',
      stage,
      message: 'AI service configuration error. Please contact support.',
      retryable: false,
      statusCode
    };
  }

  // 2. Stage-specific classification
  if (stage === 'download') {
    if (err?.code === 'VIDEO_TOO_LONG' || /exceeds the 2-minute limit|VIDEO_TOO_LONG/i.test(rawMessage)) {
      return {
        code: 'VIDEO_TOO_LONG',
        stage,
        message: 'This video is longer than 2 minutes. Please choose a video or reel under 2 minutes.',
        retryable: false,
        duration: err?.duration || null
      };
    }

    if (/Private video|Video unavailable|This video is not available|removed/i.test(rawMessage)) {
      return {
        code: 'VIDEO_UNAVAILABLE',
        stage,
        message: 'This video is private or unavailable.',
        retryable: false
      };
    }

    if (/Sign in to confirm|cookies|403: Forbidden|bot/i.test(rawMessage)) {
      return {
        code: 'VIDEO_ACCESS_BLOCKED',
        stage,
        message: 'Unable to access this video right now. Please try another link or try again later.',
        retryable: true
      };
    }

    if (/Unsupported URL|is not a valid URL/i.test(rawMessage)) {
      return {
        code: 'INVALID_VIDEO_URL',
        stage,
        message: 'This video URL is not supported. Please check the link and try again.',
        retryable: false
      };
    }

    return {
      code: 'VIDEO_DOWNLOAD_FAILED',
      stage,
      message: 'Could not download the video. Please check the link and try again.',
      retryable: true
    };
  }

  if (stage === 'upload') {
    return {
      code: 'VIDEO_UPLOAD_FAILED',
      stage,
      message: 'Failed to upload the video for analysis. Please try again.',
      retryable: true
    };
  }

  if (stage === 'extract') {
    return {
      code: 'AI_EXTRACTION_FAILED',
      stage,
      message: 'Could not extract workout details from this video. Please try again.',
      retryable: true
    };
  }

  if (stage === 'save') {
    return {
      code: 'DATABASE_ERROR',
      stage,
      message: 'Failed to save your workout. Please try again.',
      retryable: true
    };
  }

  // 3. Generic fallback
  return {
    code: 'PROCESSING_FAILED',
    stage,
    message: 'Something went wrong while processing your video. Please try again.',
    retryable: true,
    ...(statusCode ? { statusCode } : {})
  };
};

