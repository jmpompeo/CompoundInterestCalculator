import { NextApiRequest, NextApiResponse } from "next";

interface InterestResult {
  finalAmount: number
}

export default async function handler(req: NextApiRequest, result: NextApiResponse) {
  let { startingBalance, interestRate, years } = req.query;

  if (!startingBalance || !interestRate || !years) {
    return result.status(400).json({error: "Missing required parameters"});
  }

  try {
    let response = await fetch(
      'https://compound-interest-calculator.azurewebsites.net/api/compoundcalc=${startingBalance}&interestRate=${interestRate}&years=${years}'
    );

    if(!response.ok) {
      throw new Error('Failed to fetch calculation from Azure Function');
    }

    let data = await response.json();
    result.status(200).json(data);    
  } catch (error : any) {
    console.error("API error:", error);
    result.status(500).json({ error: error.message || "Internal server error"});
  }
}
