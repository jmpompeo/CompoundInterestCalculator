// src/app/test/page.tsx
import { useEffect, useState } from "react";
import { json } from "stream/consumers";

interface InterestReq {
  startingBalance: number;
  interestRate: number;
  years: number;
}

export default function HomePage() {
  const[data, setData] = useState<InterestReq[] | null>(null);
  const[loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('api/compoundcalc');
        const result: InterestReq[] = await response.json();
        setData(result);
      } catch (error) {
        console.error('Error fetching data', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Data from Azure function:</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}