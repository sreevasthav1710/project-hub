import { useState } from 'react';

interface TechStackProps {
  technologies: string[];
  max?: number;
}

export default function TechStack({ technologies, max = 4 }: TechStackProps) {
  const [expanded, setExpanded] = useState(false);

  const displayed = expanded
    ? technologies
    : technologies.slice(0, max);

  const remaining = technologies.length - max;

  if (!technologies || technologies.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {displayed.map((tech, index) => (
        <span key={index} className="tech-tag">
          {tech}
        </span>
      ))}

      {!expanded && remaining > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="tech-tag opacity-70 hover:opacity-100 transition cursor-pointer"
        >
          +{remaining} more
        </button>
      )}

      {expanded && technologies.length > max && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="tech-tag opacity-70 hover:opacity-100 transition cursor-pointer"
        >
          Show less
        </button>
      )}
    </div>
  );
}
