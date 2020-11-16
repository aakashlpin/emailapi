import axios from 'axios';
import { Promise } from 'bluebird';
import { format } from 'date-fns';
// import queues from '~/src/redis-queue';
import { genericErrorHandler } from '../../../../src/utils';

const { BitlyClient, isBitlyErrResponse } = require('bitly');
const jsdom = require('jsdom');
// const getUrls = require('get-urls');

const { BITLY_ACCESS_TOKEN, INLOOPWITH_API_KEY } = process.env;

const bitly = new BitlyClient(BITLY_ACCESS_TOKEN);

const { JSDOM } = jsdom;

require('~/src/queues');

const getHumanDate = (date) => format(new Date(date), 'dd MMM yy');

//     // https://inloopwith.netlify.app/api/feed

// 'https://webhook.site/cf44478c-5558-4aff-80cf-dd20aa42e84b';
const INLOOPWITH_URL = 'https://inloopwith.netlify.app/api/webhooks/feed';

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
    }, 60 * 1000);

    const { data } = await axios({
      method: 'GET',
      url,
      timeout: 60 * 1000,
      cancelToken: source.token,
    });

    if (!data) {
      return null;
    }
    const description = await getDescription(data);
    return {
      socialDescription: description,
    };
  } catch (e) {
    console.log('linkPreviewGenerator error', e);
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

// function sendWhatsApp(content) {
//   queues.sendWhatsAppQueue.add({
//     path: '/sendText',
//     args: [WA_SELF_NUMBER, content],
//   });
// }

const contentFooter = [
  '_fin_',
  `Feedback and ❤️ always appreciated! Have a great day ahead ✨`,
].join('\n');

async function getProductHuntDigest(dataItem, date) {
  const humanDate = getHumanDate(date);
  const keys = ['ph_product_name', 'ph_upvotes', 'ph_comments', 'ph_title'];
  if (!keys.every((key) => dataItem[key])) {
    console.log('sending getProductHuntDigest failed!');
    return;
  }

  const productHunt = mergeDataKeys(dataItem, keys);
  const props = await getLinkPreviewData(productHunt, 'ph_product_name_link', [
    'ph_product_name_link',
  ]);

  const feedItems = props.map(
    ({ previewData, shortLinksRef, originalData }) => ({
      name: originalData.ph_product_name,
      title: originalData.ph_title,
      description: previewData?.socialDescription,
      upvotes_count: originalData.ph_upvotes,
      comments_count: originalData.ph_comments,
      short_link: shortLinksRef.ph_product_name_link_shortlink,
      original_link: originalData.ph_product_name_link,
    }),
  );

  try {
    // fire and forget
    const postBody = {
      tag: 'product_hunt',
      feed_date: date,
      items: feedItems,
    };

    axios.post(INLOOPWITH_URL, postBody, {
      headers: {
        'x-ilw-api-key': INLOOPWITH_API_KEY,
      },
    });
  } catch (e) {
    console.log(e);
  }

  const productHuntContentBody = props
    .map(({ previewData, shortLinksRef, originalData }, idx) => {
      return [
        `${idx + 1}. *${originalData.ph_product_name}* — ${
          originalData.ph_title
        }`,
        previewData?.socialDescription
          ? `\n_"${previewData.socialDescription.trim()}"_`
          : null,
        `👍 ${originalData.ph_upvotes} | 💬 ${originalData.ph_comments} | ${
          shortLinksRef.ph_product_name_link_shortlink ||
          originalData.ph_product_name_link
        }`,
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

  console.log({ productHuntPost });

  // sendWhatsApp(productHuntPost);
}

async function getHackerNewsDigest(dataItem, date) {
  const humanDate = getHumanDate(date);
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
      upvotes_count: originalData.hn_upvotes,
      comments_count: originalData.hn_comments,
      short_link: shortLinksRef.hn_comments_link_shortlink,
      original_link: originalData.hn_comments_link,
    }),
  );

  try {
    // fire and forget
    const postBody = {
      tag: 'hacker_news',
      feed_date: date,
      items: feedItems,
    };
    axios.post(INLOOPWITH_URL, postBody, {
      headers: {
        'x-ilw-api-key': INLOOPWITH_API_KEY,
      },
    });
  } catch (e) {
    console.log(e);
  }

  const hackerNewsContentBody = props
    .map(({ previewData, shortLinksRef, originalData }, idx) => {
      return [
        `${idx + 1}. *${originalData.hn_title}*`,
        previewData?.socialDescription
          ? `\n_"${previewData.socialDescription.trim()}"_`
          : null,
        `👍 ${originalData.hn_upvotes} | 💬 ${originalData.hn_comments} | ${
          shortLinksRef.hn_comments_link_shortlink ||
          originalData.hn_comments_link
        }`,
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

  console.log({ hackerNewsPost });
  // sendWhatsApp(hackerNewsPost);
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
