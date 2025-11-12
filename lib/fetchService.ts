
/**
 * A centralized service for making API fetch requests.
 * This is a converted version of your fetchData function to TypeScript.
 */
async function fetchData<T>(url: string, options: RequestInit = {}): Promise<T> {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! Status: ${response.status}, Details: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Fetch operation failed:', error);
    throw error;
  }
}

export default fetchData;
