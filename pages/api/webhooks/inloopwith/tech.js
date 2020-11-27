import axios from 'axios';
import { Promise } from 'bluebird';
import { genericErrorHandler } from '../../../../src/utils';

const { BitlyClient, isBitlyErrResponse } = require('bitly');
const jsdom = require('jsdom');
const getUrls = require('get-urls');

const { JSDOM } = jsdom;

const { BITLY_ACCESS_TOKEN, INLOOPWITH_API_KEY, INLOOPWITH_URL } = process.env;

const bitly = new BitlyClient(BITLY_ACCESS_TOKEN);

require('~/src/queues');

const postToInLoopWith = async (body) => {
  await axios.post(INLOOPWITH_URL, body, {
    headers: {
      'x-ilw-api-key': INLOOPWITH_API_KEY,
    },
  });
};

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

const getImage = async (htmlString, uri) => {
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
async function linkPreviewGenerator(url) {
  try {
    const source = axios.CancelToken.source();
    setTimeout(() => {
      source.cancel();
    }, 30 * 1000);

    const { data } = await axios({
      method: 'GET',
      url,
      timeout: 30 * 1000,
      cancelToken: source.token,
    });

    if (!data) {
      return null;
    }
    const image = await getImage(data);
    const description = await getDescription(data);
    return {
      socialImage: image,
      socialDescription: description,
    };
  } catch (e) {
    // console.log('linkPreviewGenerator error', e);
    return null;
  }
}

const generateShortLink = async (longUrl) => {
  try {
    const response = await bitly.shorten(longUrl);
    return response.link;
  } catch (error) {
    if (isBitlyErrResponse(error)) {
      // Inferred type by TS is `BitlyErrorResponse`
      console.log(`Bitly error: ${error.description}`);
    } else {
      genericErrorHandler(error);
    }
    return null;
  }
};

const getLinkPreviewData = async (array, linkPreviewKey, longUrlKeys) => {
  const props = await Promise.map(array, async (article) => {
    const originalLink = article[linkPreviewKey];
    const originalUrl = originalLink.includes('?')
      ? originalLink.split('?')[0]
      : originalLink;

    let previewData = null;
    try {
      previewData = await linkPreviewGenerator(article[linkPreviewKey]);
    } catch (e) {
      // console.log(e);
    }
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

async function getProductHuntDigest(dataItem, date) {
  try {
    const keys = ['ph_product_name', 'ph_upvotes', 'ph_comments', 'ph_title'];
    if (!keys.every((key) => dataItem[key])) {
      console.log('sending getProductHuntDigest failed!');
      return;
    }

    const productHunt = mergeDataKeys(dataItem, keys);
    const props = await getLinkPreviewData(
      productHunt,
      'ph_product_name_link',
      ['ph_product_name_link'],
    );

    const feedItems = props.map(
      ({ previewData, shortLinksRef, originalData }) => ({
        name: originalData.ph_product_name,
        title: originalData.ph_title,
        description: previewData?.socialDescription,
        image: previewData?.socialImage,
        upvotes_count: originalData.ph_upvotes,
        comments_count: originalData.ph_comments,
        short_link: shortLinksRef.ph_product_name_link_shortlink,
        original_link: originalData.ph_product_name_link,
      }),
    );

    const postBody = {
      tag: 'product_hunt',
      feed_date: new Date(date).toISOString(),
      items: feedItems,
    };

    await postToInLoopWith(postBody);
  } catch (e) {
    console.log(e);
  }
}

async function getHackerNewsDigest(dataItem, date) {
  try {
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

    const feedItems = props.map(
      ({ previewData, shortLinksRef, originalData }) => ({
        title: originalData.hn_title,
        description: previewData?.socialDescription,
        image: previewData?.socialImage,
        upvotes_count: originalData.hn_upvotes,
        comments_count: originalData.hn_comments,
        short_link: shortLinksRef.hn_comments_link_shortlink,
        original_link: originalData.hn_comments_link,
      }),
    );

    const postBody = {
      tag: 'hacker_news',
      feed_date: new Date(date).toISOString(),
      items: feedItems,
    };
    await postToInLoopWith(postBody);
  } catch (e) {
    console.log(e);
  }
}

export default async function handle(req, res) {
  const { endpoint } = req.body;
  console.log('inloopwith tech processing for endpoint', endpoint);
  if (!endpoint) {
    res.status(400).json({ error: 'expected `endpoint`' });
    return;
  }
  const { data } = await axios(endpoint);
  if (!Array.isArray(data) && !data.length) {
    res.status(400).json({ error: 'endpoint not populated' });
    return;
  }
  const [dataItem] = data;
  const date = dataItem.email_date;
  // return early as the processing below can take > network timeout seconds
  res.json({});

  try {
    await Promise.all([
      getHackerNewsDigest(dataItem, date),
      getProductHuntDigest(dataItem, date),
    ]);
  } catch (e) {
    genericErrorHandler(e);
  }
}
