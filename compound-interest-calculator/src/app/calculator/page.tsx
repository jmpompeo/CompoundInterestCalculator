// src/app/test/page.tsx
"use client";

import { useEffect, useState } from "react";

interface InterestReq {
  startingBalance: number;
  interestRate: number;
  years: number;
}

interface InterestResult {
  finalAmount: number;
}

 export default function GetResult() {
  let [formData, setFormData] = useState<InterestReq>({
    startingBalance: 0,
    interestRate: 0,
    years: 0
  });

  let [result, setResult] = useState<InterestResult | null>(null);
  let [loading, setLoading] = useState<boolean>(false);
  let [error, setError] = useState<string | null>(null);

  let handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    let { name, value} = e.target;
    setFormData({
      ...formData,
      [name]:parseFloat(value),
    });
  };

  let handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let response = await fetch("api/compoundcalc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if(!response.ok) {
        throw new Error(
          'Error: ${response.Status} ${response.statusText}'
        );
      }

      let data: InterestResult = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white shadow-md rounded">
      <h1 className="text-2xl font-bold mb-4">
        Compound Interest Calculator
      </h1>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label
            htmlFor="startingBalance"
            className="block text-gray-700 font-medium mb-2">
            Starting Balance
          </label>
          <input 
            type="number"
            id="startingBalance"
            name="startingBalance"
            value={formData.startingBalance}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 rounded"
            step="0.01"
            min="0"/>
        </div>
        <div className="mb-4">
          <label
            htmlFor="startingBalance"
            className="block text-gray-700 font-medium mb-2">
            Annual Interest Rate (%)
          </label>
          <input 
            type="number"
            id="interestRate"
            name="interestRate"
            value={formData.interestRate}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 rounded"
            step="0.01"
            min="0"/>
        </div>
        <div className="mb-4">
          <label
            htmlFor="years"
            className="block text-gray-700 font-medium mb-2">
            Number of Years
          </label>
          <input 
            type="number"
            id="years"
            name="years"
            value={formData.years}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 rounded"
            step="0.01"
            min="0"/>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-500 text-white font-semibold rounded hover:bg-blue-600 transition duration-200">
          {loading ? "Calculating..." : "Calculate"}
        </button>  
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>  
      )}

      {result && (
        <div className="mt-6 p-4 bg-green-100 text-green-800 rounded">
          <h2 className="text-xl font-bold mb-2">
            Calculation Result
          </h2>
          <p>
            <strong>
              Final Amount:</strong> $
              {result.finalAmount.toFixed(2)}            
          </p>
        </div>
      )}
    </div>
   );
 }