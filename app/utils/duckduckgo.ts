import axios from 'axios';
import * as cheerio from 'cheerio';

export async function fetchImageUrl(keywords: string): Promise<string> {
    const apiUrl = `/api/searchImage?q=${encodeURIComponent(keywords)}`;
  
    try {
      const response = await axios.get(apiUrl);
      const data = response.data;
  
      if (data.imageUrl) {
        return data.imageUrl;
      } else {
        return "";
      }
    } catch (error) {
      console.error('Error fetching image:', (error as any).message);
      return "";
    }
  }
