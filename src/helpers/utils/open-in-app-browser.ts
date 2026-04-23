import { router } from "expo-router";

type OpenInAppBrowserOptions = {
  title?: string;
};

const SUPPORTED_PROTOCOLS = new Set(["http:", "https:"]);

const normalizeUrl = (url: string) => {
  try {
    const parsedUrl = new URL(url);

    if (!SUPPORTED_PROTOCOLS.has(parsedUrl.protocol)) {
      return null;
    }

    return parsedUrl.toString();
  } catch {
    return null;
  }
};

export const openInAppBrowser = (
  url: string,
  options: OpenInAppBrowserOptions = {}
) => {
  const normalizedUrl = normalizeUrl(url);

  if (!normalizedUrl) {
    throw new Error(
      "openInAppBrowser only supports absolute http(s) URLs."
    );
  }

  router.push({
    pathname: "/webview",
    params: {
      url: normalizedUrl,
      title: options.title,
    },
  });
};
