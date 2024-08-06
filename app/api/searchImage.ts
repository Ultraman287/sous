// pages/api/searchImage.ts

import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { q } = req.query;
  console.log("Query:", q);

  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Query parameter "q" is required.' });
  }

  const searchUrl = 'https://duckduckgo.com/';
  const params = new URLSearchParams({ q });

  try {
    // First request to get the token (vqd)
    const response = await axios.post(searchUrl, params.toString());
    const searchObj = response.data.match(/vqd=([\d-]+)\&/);

    if (!searchObj) {
      return res.status(500).json({ error: 'Token Parsing Failed!' });
    }

    const vqdToken = searchObj[1];

    const headers = {
      'dnt': '1',
      'accept-encoding': 'gzip, deflate, sdch, br',
      'x-requested-with': 'XMLHttpRequest',
      'accept-language': 'en-GB,en-US;q=0.8,en;q=0.6,ms;q=0.4',
      'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36',
      'accept': 'application/json, text/javascript, */*; q=0.01',
      'referer': 'https://duckduckgo.com/',
      'authority': 'duckduckgo.com',
    };

    const imageSearchParams = {
      l: 'wt-wt',
      o: 'json',
      q,
      vqd: vqdToken,
      f: ',,,',
      p: '2'
    };

    const requestUrl = searchUrl + "i.js";

    // Second request to get the image URL
    const imageResponse = await axios.get(requestUrl, { headers, params: imageSearchParams });
    const data = imageResponse.data;

    if (data.results && data.results.length > 0) {
      const firstImageUrl = data.results[0].image;
      res.status(200).json({ imageUrl: firstImageUrl });
    } else {
      res.status(404).json({ error: 'No images found.' });
    }

  } catch (error) {
    res.status(500).json({ error: 'Error fetching image: ' + (error as any).message });
  }
}
