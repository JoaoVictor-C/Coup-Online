namespace CoupGameBackend.Models
{
    // Base class for action parameters
    public abstract class ActionParameters
    {
        public string TargetUserId { get; set; } = string.Empty;
    }

    // Specific parameter classes
    public class CoupActionParameters : ActionParameters 
    { 
        // Add properties specific to Coup action if needed
    }

    public class StealActionParameters : ActionParameters 
    { 
        // Add properties specific to Steal action if needed
    }

    public class AssassinateActionParameters : ActionParameters 
    { 
        // Add properties specific to Assassinate action if needed
    }

    public class ConcreteActionParameters : ActionParameters
   {
       public string TargetUserId { get; set; }
   }
}