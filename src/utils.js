import Sentry from '~/src/sentry';

// eslint-disable-next-line import/prefer-default-export
export const genericErrorHandler = (e) => {
  if (e.isAxiosError) {
    const axiosError = e;
    const captureError = axiosError.toJSON();
    console.log('genericErrorHandler Axios error', captureError);
    Sentry.captureException(captureError);
  } else {
    console.log('genericErrorHandler error', e);
    Sentry.captureException(e);
  }
};
