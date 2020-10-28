import axios from 'axios';
import { Promise } from 'bluebird';
import { format } from 'date-fns';

const getUrls = require('get-urls');

const {
  FIREBASE_WEB_API_KEY,
  FIREBASE_SHORLINK_DOMAIN,
  WA_API_URI,
  WA_SELF_NUMBER,
  WA_API_KEY,
} = process.env;

const jsdom = require('jsdom');

const { JSDOM } = jsdom;

function mergeDataKeys(dataItem, keys) {
  const mergedData = [...new Array(dataItem[keys[0]].length)].map(() => ({}));

  [...new Array(dataItem[keys[0]].length)]
    .map((_, idx) => idx)
    .forEach((idx) => {
      const newProps = keys.reduce(
        (accum, key) => ({
          ...accum,
          ...dataItem[key][idx],
        }),
        {},
      );
      mergedData[idx] = {
        ...mergedData[idx],
        ...newProps,
      };
    });

  return mergedData;
}

const urlImageIsAccessible = async (url) => {
  const correctedUrls = getUrls(url);
  if (correctedUrls.size !== 0) {
    const urlResponse = await axios(correctedUrls.values().next().value);
    const contentType = urlResponse.headers['content-type'];
    return new RegExp('image/*').test(contentType);
  }
  return false;
};

const getTitle = async (htmlString) => {
  try {
    const dom = new JSDOM(htmlString);
    const { document } = dom.window;

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle != null && ogTitle.content.length > 0) {
      return ogTitle.content;
    }
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle != null && twitterTitle.content.length > 0) {
      return twitterTitle.content;
    }
    const docTitle = document.title;
    if (docTitle != null && docTitle.length > 0) {
      return docTitle;
    }
    const h1 = document.querySelector('h1').innerHTML;
    if (h1 != null && h1.length > 0) {
      return h1;
    }
    const h2 = document.querySelector('h1').innerHTML;
    if (h2 != null && h2.length > 0) {
      return h2;
    }
    return null;
  } catch (e) {
    return null;
  }
};

const getDescription = async (htmlString) => {
  try {
    const dom = new JSDOM(htmlString);
    const { document } = dom.window;

    const ogDescription = document.querySelector(
      'meta[property="og:description"]',
    );
    if (ogDescription != null && ogDescription.content.length > 0) {
      return ogDescription.content;
    }
    const twitterDescription = document.querySelector(
      'meta[name="twitter:description"]',
    );
    if (twitterDescription != null && twitterDescription.content.length > 0) {
      return twitterDescription.content;
    }
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription != null && metaDescription.content.length > 0) {
      return metaDescription.content;
    }
    return null;
  } catch (e) {
    return null;
  }
};

const getImg = async (htmlString, uri) => {
  try {
    const dom = new JSDOM(htmlString);
    const { document } = dom.window;

    const ogImg = document.querySelector('meta[property="og:image"]');
    if (
      ogImg != null &&
      ogImg.content.length > 0 &&
      (await urlImageIsAccessible(ogImg.content))
    ) {
      return ogImg.content;
    }
    const imgRelLink = document.querySelector('link[rel="image_src"]');
    if (
      imgRelLink != null &&
      imgRelLink.href.length > 0 &&
      (await urlImageIsAccessible(imgRelLink.href))
    ) {
      return imgRelLink.href;
    }
    const twitterImg = document.querySelector('meta[name="twitter:image"]');
    if (
      twitterImg != null &&
      twitterImg.content.length > 0 &&
      (await urlImageIsAccessible(twitterImg.content))
    ) {
      return twitterImg.content;
    }
    const imgs = Array.from(document.getElementsByTagName('img'));
    if (imgs.length > 0) {
      // eslint-disable-next-line no-return-assign
      imgs.forEach((img) =>
        img.src.indexOf('//') === -1
          ? // eslint-disable-next-line no-param-reassign
            (img.src = `${new URL(uri).origin}/${img.src}`)
          : img.src,
      );
      return imgs[0].src;
    }

    return null;
  } catch (e) {
    return null;
  }
};

async function linkPreviewGenerator(url) {
  try {
    const { data } = await axios(url);
    const title = await getTitle(data);
    const description = await getDescription(data);
    const image = await getImg(data, url);
    return {
      socialTitle: title,
      socialImageLink: image,
      socialDescription: description,
    };
  } catch (e) {
    console.log('linkPreviewGenerator error', e);
    return null;
  }
}

const generateShortLink = async (longUrl, longUrlSocialProps = {}) => {
  try {
    const {
      data: { shortLink },
    } = await axios.post(
      `https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=${FIREBASE_WEB_API_KEY}`,
      {
        dynamicLinkInfo: {
          domainUriPrefix: FIREBASE_SHORLINK_DOMAIN,
          link: longUrl,
          socialMetaTagInfo: longUrlSocialProps,
          navigationInfo: {
            enableForcedRedirect: true,
          },
        },
        suffix: {
          option: 'SHORT',
        },
      },
    );

    return shortLink;
  } catch (e) {
    console.log('generateShortLink error', e);
    return null;
  }
};

const getLinkPreviewData = async (array, linkPreviewKey, longUrlKeys) => {
  const props = await Promise.mapSeries(array, async (article) => {
    const originalLink = article[linkPreviewKey];
    const originalUrl = originalLink.includes('?')
      ? originalLink.split('?')[0]
      : originalLink;

    const previewData = await linkPreviewGenerator(article[linkPreviewKey]);
    const allShortLinks = await Promise.all(
      longUrlKeys.map((urlKey) =>
        generateShortLink(
          article[urlKey],
          urlKey === linkPreviewKey ? previewData : null,
        ),
      ),
    );

    const shortLinksRef = longUrlKeys.reduce(
      (accum, longUrlKey, idx) => ({
        ...accum,
        [`${longUrlKey}_shortlink`]: allShortLinks[idx],
      }),
      {},
    );

    return {
      previewData,
      originalData: {
        ...article,
        [linkPreviewKey]: originalUrl,
      },
      shortLinksRef,
    };
  });

  return props.filter((item) => item);
};

async function sendWhatsApp(content) {
  return axios.post(
    `${WA_API_URI}/sendLinkWithAutoPreview`,
    {
      args: [WA_SELF_NUMBER, content],
    },
    {
      headers: {
        key: WA_API_KEY,
      },
    },
  );
}

const contentFooter = [
  '_fin_',
  `Feedback and ❤️ always appreciated! Have a great day ahead ✨`,
].join('\n');

async function getProductHuntDigest(dataItem, humanDate) {
  const keys = ['ph_product_name', 'ph_upvotes', 'ph_comments', 'ph_title'];
  if (!keys.every((key) => dataItem[key])) {
    console.log('sending getProductHuntDigest failed!');
    return;
  }
  const productHunt = mergeDataKeys(dataItem, keys);
  const props = await getLinkPreviewData(productHunt, 'ph_product_name_link', [
    'ph_product_name_link',
  ]);

  const productHuntContentBody = props
    .map(({ previewData, shortLinksRef, originalData }, idx) => {
      return [
        `${idx + 1}. ${
          shortLinksRef[originalData.ph_product_name_link_shortlink] ||
          originalData.ph_product_name_link
        } — *${originalData.ph_product_name}*`,
        `👍 ${originalData.ph_upvotes} | 💬 ${originalData.ph_comments}`,
        `✨ ${originalData.ph_title}`,
        previewData.socialDescription
          ? `\n➡️ ${previewData.socialDescription.trim()}`
          : null,
      ]
        .filter((i) => i)
        .join('\n');
    })
    .join('\n\n\n');

  const productHuntContentHeader = [
    `🦄 *Product Hunt Digest | ${humanDate}*`,
  ].join('\n');

  const productHuntPost = [
    productHuntContentHeader,
    productHuntContentBody,
    contentFooter,
  ].join('\n\n');

  await sendWhatsApp(productHuntPost);
}

async function getHackerNewsDigest(dataItem, humanDate) {
  const keys = ['hn_title', 'hn_upvotes', 'hn_comments', 'hn_source_website'];
  if (!keys.every((key) => dataItem[key])) {
    console.log('sending getHackerNewsDigest failed!');
    return;
  }

  const hackerNews = mergeDataKeys(dataItem, keys);
  const itemsWithVotesGreaterThan = (items, votes) =>
    items.filter((item) => Number(item.hn_upvotes) >= votes);

  const props = await getLinkPreviewData(
    itemsWithVotesGreaterThan(hackerNews, 100),
    'hn_title_link',
    ['hn_title_link', 'hn_comments_link'],
  );

  const hackerNewsContentBody = props
    .map(({ previewData, shortLinksRef, originalData }, idx) => {
      return [
        `${idx + 1}. *${originalData.hn_title}*`,
        ``,
        `🔗 Original Link:  ${
          shortLinksRef.hn_title_link_shortlink || originalData.hn_title_link
        }`,
        `🔗 HackerNews: 👍 ${originalData.hn_upvotes} | 💬 ${
          originalData.hn_comments
        } | ${
          shortLinksRef.hn_comments_link_shortlink ||
          originalData.hn_comments_link
        }`,
        previewData.socialDescription
          ? `\n➡️ ${previewData.socialDescription.trim()}`
          : null,
      ]
        .filter((i) => i)
        .join('\n');
    })
    .filter((i) => i)
    .join('\n\n\n');

  const hackerNewsContentHeader = [
    `⚡️ *Hacker News Digest | ${humanDate}*`,
  ].join('\n');

  const hackerNewsPost = [
    hackerNewsContentHeader,
    hackerNewsContentBody,
    contentFooter,
  ].join('\n\n');

  await sendWhatsApp(hackerNewsPost);
}

export default async function handle(req, res) {
  const { endpoint } = req.body;
  const { data } = await axios(endpoint);
  const [dataItem] = data;
  const date = dataItem.email_date;
  const humanDate = format(new Date(date), 'dd MMM yy');
  res.json({});
  await Promise.all([
    getProductHuntDigest(dataItem, humanDate),
    getHackerNewsDigest(dataItem, humanDate),
  ]);
}
