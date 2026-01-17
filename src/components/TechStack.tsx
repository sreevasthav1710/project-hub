interface TechStackProps {
  technologies: string[];
  max?: number;
}

export default function TechStack({ technologies, max = 4 }: TechStackProps) {
  const displayed = max ? technologies.slice(0, max) : technologies;
  const remaining = technologies.length - displayed.length;

  return (
    <div className="flex flex-wrap gap-1.5">
      {displayed.map((tech, index) => (
        <span key={index} className="tech-tag">
          {tech}
        </span>
      ))}
      {remaining > 0 && (
        <span className="tech-tag opacity-70">+{remaining}</span>
      )}
    </div>
  );
}
