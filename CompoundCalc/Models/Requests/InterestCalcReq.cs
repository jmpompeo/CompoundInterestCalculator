using System.ComponentModel.DataAnnotations;

namespace CompoundCalc.Models.Requests;

public class InterestCalcReq
{
    [Required(ErrorMessage = "Starting balance is required")]
    public double StartingBalance { get; set; }

    [Required(ErrorMessage = "Interest rate is required")]
    public double InterestRate { get; set; }

    [Required(ErrorMessage = "Years is required")]
    public int Years { get; set; }


}
