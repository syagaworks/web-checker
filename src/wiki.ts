export type WikiDetails = {
  title: string;
  pageUrl: string;
  extract: string;
  imageUrl?: string;
  imagePageUrl?: string;
  imageCredit?: string;
  imageArtist?: string;
  imageLicense?: string;
  imageLicenseUrl?: string;
};

type WikiSearchResponse = {
  query?: {
    search?: Array<{ title: string }>;
  };
};

type WikiPageResponse = {
  query?: {
    pages?: Record<
      string,
      {
        title: string;
        extract?: string;
        pageimage?: string;
        thumbnail?: { source: string };
      }
    >;
  };
};

type WikiImageResponse = {
  query?: {
    pages?: Record<
      string,
      {
        imageinfo?: Array<{
          descriptionurl?: string;
          extmetadata?: Record<string, { value?: string }>;
        }>;
      }
    >;
  };
};

const wikiApi = "https://ja.wikipedia.org/w/api.php";

function stripHtml(value?: string) {
  const doc = new DOMParser().parseFromString(value ?? "", "text/html");
  return doc.body.textContent?.trim() ?? "";
}

async function getJson<T>(params: Record<string, string>) {
  const url = new URL(wikiApi);
  Object.entries({ format: "json", origin: "*", ...params }).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url);
  if (!response.ok) throw new Error("Wikipedia API request failed");
  return response.json() as Promise<T>;
}

export async function fetchWikiDetails(query: string): Promise<WikiDetails | null> {
  const search = await getJson<WikiSearchResponse>({
    action: "query",
    list: "search",
    srsearch: query,
    srlimit: "1",
  });
  const title = search.query?.search?.[0]?.title ?? query;

  const page = await getJson<WikiPageResponse>({
    action: "query",
    prop: "extracts|pageimages|info",
    exintro: "1",
    explaintext: "1",
    redirects: "1",
    inprop: "url",
    pithumbsize: "900",
    titles: title,
  });
  const pageData = Object.values(page.query?.pages ?? {})[0];
  if (!pageData) return null;

  const pageUrl = `https://ja.wikipedia.org/wiki/${encodeURIComponent(pageData.title.replace(/ /g, "_"))}`;
  const details: WikiDetails = {
    title: pageData.title,
    pageUrl,
    extract: (pageData.extract ?? "").replace(/\s+/g, " ").slice(0, 320),
    imageUrl: pageData.thumbnail?.source,
  };

  if (pageData.pageimage) {
    const image = await getJson<WikiImageResponse>({
      action: "query",
      prop: "imageinfo",
      iiprop: "extmetadata|url",
      titles: `File:${pageData.pageimage}`,
    });
    const imageInfo = Object.values(image.query?.pages ?? {})[0]?.imageinfo?.[0];
    const meta = imageInfo?.extmetadata ?? {};

    details.imagePageUrl = imageInfo?.descriptionurl;
    details.imageCredit = stripHtml(meta.Credit?.value);
    details.imageArtist = stripHtml(meta.Artist?.value);
    details.imageLicense = stripHtml(meta.LicenseShortName?.value);
    details.imageLicenseUrl = meta.LicenseUrl?.value;
  }

  return details;
}
