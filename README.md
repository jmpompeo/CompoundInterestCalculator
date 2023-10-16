# CompoundInterestCalculator

This simple compound interest calculator is a great way to estimate how much interest you will gain, as well as an ending balance for a given starting balance, interest rate, and years. Right now, this is a simple console
application that has the user input the respective amounts they want to calculate 

## How it Works
The user types in three values: the starting balance, the interest rate, and the number of years you want to calculate the interest for. In `Program.cs` there is one method call (`GetYearlyAmountWithInterest`). This method does a few things. First, it converts the interest rate percentage to a decimal, as that is what's used to calculate the interest. 

The for loop calculates the amount of interest, and then adds that to the starting balance. It does this for the given amount of years in `Program.cs`. After we get the final number, we then convert it to dollars. I live in the US, but if you want to use this for your local currency
