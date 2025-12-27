interface BionicTextProps {
  text: string;
  enabled?: boolean;
}

const BionicText = ({ text, enabled = true }: BionicTextProps) => {
  if (!enabled) {
    return <p className="text-muted-foreground leading-relaxed text-lg">{text}</p>;
  }

  // Split text into words and apply bionic reading style
  const words = text.split(" ");

  return (
    <p className="leading-relaxed text-lg">
      {words.map((word, index) => {
        // Calculate how many letters to bold (roughly half, min 1)
        const boldLength = Math.max(1, Math.ceil(word.length / 2));
        const boldPart = word.substring(0, boldLength);
        const normalPart = word.substring(boldLength);

        return (
          <span key={index}>
            <span className="font-bold text-foreground">{boldPart}</span>
            <span className="text-muted-foreground">{normalPart}</span>
            {index < words.length - 1 ? " " : ""}
          </span>
        );
      })}
    </p>
  );
};

export default BionicText;
