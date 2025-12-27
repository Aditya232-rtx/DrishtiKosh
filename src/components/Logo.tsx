import logoIcon from "@/assets/logo-icon.png";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const Logo = ({ size = "md", showText = true }: LogoProps) => {
  const sizeClasses = {
    sm: "h-8",
    md: "h-10",
    lg: "h-14",
  };

  const textSizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <div className="flex items-center gap-2">
      <img 
        src={logoIcon} 
        alt="DrishtiKosh Logo" 
        className={`${sizeClasses[size]} w-auto`}
      />
      {showText && (
        <span className={`${textSizeClasses[size]} font-bold text-foreground`}>
          drishtikosh
        </span>
      )}
    </div>
  );
};

export default Logo;
