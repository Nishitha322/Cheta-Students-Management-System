import React from 'react';
import { 
  Code2, Database, Terminal, Cpu, Binary, GitBranch, Atom, 
  FileCode, Server, Cloud, Laptop, Braces, Brackets, GitFork, 
  GitPullRequest, SquareCode, Workflow, Network, Layers, Globe, 
  Shield, FileJson 
} from 'lucide-react';

const GithubIcon = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

export default function FloatingTechBackground() {
  const items = [
    // === MOBILE VISIBLE (8 items) ===
    { type: 'icon', element: Atom, size: 36, top: '12%', left: '8%', color: 'var(--particle-1)', delay: '0s', duration: '14s', anim: 'float-pattern-1', visibility: 'mobile', opacity: 0.11 },
    { type: 'icon', element: Database, size: 48, top: '22%', left: '85%', color: 'var(--particle-3)', delay: '-3s', duration: '22s', anim: 'float-pattern-2', visibility: 'mobile', opacity: 0.08 },
    { type: 'icon', element: Server, size: 64, top: '48%', left: '15%', color: 'var(--primary)', delay: '-5s', duration: '30s', anim: 'float-pattern-3', visibility: 'mobile', opacity: 0.06 },
    { type: 'icon', element: Terminal, size: 54, top: '58%', left: '78%', color: 'var(--info)', delay: '-7s', duration: '24s', anim: 'float-pattern-4', visibility: 'mobile', opacity: 0.08 },
    { type: 'text', element: '</>', size: 32, top: '78%', left: '8%', color: 'var(--particle-2)', delay: '-1.5s', duration: '16s', anim: 'float-pattern-5', visibility: 'mobile', opacity: 0.12 },
    { type: 'icon', element: Cpu, size: 85, top: '88%', left: '82%', color: 'var(--particle-1)', delay: '-10s', duration: '38s', anim: 'float-pattern-6', visibility: 'mobile', opacity: 0.045 },
    { type: 'icon', element: Cloud, size: 52, top: '35%', left: '45%', color: 'var(--info)', delay: '-4s', duration: '20s', anim: 'float-pattern-1', visibility: 'mobile', opacity: 0.085 },
    { type: 'icon', element: Laptop, size: 70, top: '70%', left: '52%', color: 'var(--primary)', delay: '-8s', duration: '32s', anim: 'float-pattern-2', visibility: 'mobile', opacity: 0.055 },

    // === TABLET VISIBLE (7 items) ===
    { type: 'text', element: '{}', size: 34, top: '8%', left: '62%', color: 'var(--info)', delay: '-1s', duration: '15s', anim: 'float-pattern-3', visibility: 'tablet', opacity: 0.10 },
    { type: 'icon', element: GitBranch, size: 56, top: '28%', left: '28%', color: 'var(--primary)', delay: '-2s', duration: '23s', anim: 'float-pattern-4', visibility: 'tablet', opacity: 0.075 },
    { type: 'icon', element: Binary, size: 72, top: '92%', left: '25%', color: 'var(--particle-3)', delay: '-6s', duration: '28s', anim: 'float-pattern-5', visibility: 'tablet', opacity: 0.05 },
    { type: 'text', element: '>_', size: 36, top: '42%', left: '72%', color: 'var(--particle-1)', delay: '-4s', duration: '17s', anim: 'float-pattern-6', visibility: 'tablet', opacity: 0.09 },
    { type: 'icon', element: SquareCode, size: 50, top: '62%', left: '35%', color: 'var(--particle-2)', delay: '-12s', duration: '21s', anim: 'float-pattern-1', visibility: 'tablet', opacity: 0.08 },
    { type: 'text', element: '[]', size: 28, top: '80%', left: '92%', color: 'var(--info)', delay: '-3s', duration: '13s', anim: 'float-pattern-2', visibility: 'tablet', opacity: 0.11 },
    { type: 'icon', element: Code2, size: 46, top: '5%', left: '90%', color: 'var(--primary)', delay: '-9s', duration: '19s', anim: 'float-pattern-3', visibility: 'tablet', opacity: 0.085 },

    // === DESKTOP VISIBLE (10 items) ===
    { type: 'icon', element: FileCode, size: 68, top: '18%', left: '38%', color: 'var(--info)', delay: '-14s', duration: '29s', anim: 'float-pattern-4', visibility: 'desktop', opacity: 0.06 },
    { type: 'icon', element: GithubIcon, size: 92, top: '15%', left: '75%', color: 'var(--primary)', delay: '-5s', duration: '40s', anim: 'float-pattern-5', visibility: 'desktop', opacity: 0.04 },
    { type: 'icon', element: GitFork, size: 48, top: '32%', left: '10%', color: 'var(--particle-1)', delay: '-11s', duration: '22s', anim: 'float-pattern-6', visibility: 'desktop', opacity: 0.085 },
    { type: 'icon', element: GitPullRequest, size: 62, top: '52%', left: '92%', color: 'var(--primary)', delay: '-8s', duration: '27s', anim: 'float-pattern-1', visibility: 'desktop', opacity: 0.065 },
    { type: 'icon', element: Workflow, size: 58, top: '68%', left: '8%', color: 'var(--particle-3)', delay: '-13s', duration: '25s', anim: 'float-pattern-2', visibility: 'desktop', opacity: 0.075 },
    { type: 'text', element: 'python', size: 38, top: '82%', left: '65%', color: 'var(--particle-2)', delay: '-7s', duration: '16s', anim: 'float-pattern-3', visibility: 'desktop', opacity: 0.10 },
    { type: 'text', element: 'java', size: 44, top: '94%', left: '48%', color: 'var(--info)', delay: '-15s', duration: '18s', anim: 'float-pattern-4', visibility: 'desktop', opacity: 0.09 },
    { type: 'icon', element: Network, size: 80, top: '45%', left: '52%', color: 'var(--particle-1)', delay: '-20s', duration: '36s', anim: 'float-pattern-5', visibility: 'desktop', opacity: 0.045 },
    { type: 'text', element: 'js', size: 34, top: '25%', left: '58%', color: 'var(--primary)', delay: '-2s', duration: '14s', anim: 'float-pattern-6', visibility: 'desktop', opacity: 0.11 },
    { type: 'icon', element: Layers, size: 52, top: '60%', left: '68%', color: 'var(--info)', delay: '-6s', duration: '21s', anim: 'float-pattern-1', visibility: 'desktop', opacity: 0.08 },

    // === LARGE DESKTOP VISIBLE (8 items) ===
    { type: 'icon', element: Globe, size: 75, top: '3%', left: '22%', color: 'var(--primary)', delay: '-18s', duration: '31s', anim: 'float-pattern-2', visibility: 'large-desktop', opacity: 0.05 },
    { type: 'text', element: 'ts', size: 32, top: '15%', left: '93%', color: 'var(--particle-1)', delay: '-4s', duration: '13s', anim: 'float-pattern-3', visibility: 'large-desktop', opacity: 0.11 },
    { type: 'icon', element: Shield, size: 56, top: '38%', left: '90%', color: 'var(--particle-3)', delay: '-12s', duration: '24s', anim: 'float-pattern-4', visibility: 'large-desktop', opacity: 0.075 },
    { type: 'icon', element: FileJson, size: 95, top: '55%', left: '3%', color: 'var(--primary)', delay: '-25s', duration: '44s', anim: 'float-pattern-5', visibility: 'large-desktop', opacity: 0.035 },
    { type: 'text', element: 'docker', size: 50, top: '75%', left: '38%', color: 'var(--particle-2)', delay: '-10s', duration: '20s', anim: 'float-pattern-6', visibility: 'large-desktop', opacity: 0.085 },
    { type: 'text', element: 'aws', size: 78, top: '86%', left: '93%', color: 'var(--info)', delay: '-22s', duration: '33s', anim: 'float-pattern-1', visibility: 'large-desktop', opacity: 0.045 },
    { type: 'icon', element: Braces, size: 36, top: '88%', left: '58%', color: 'var(--particle-1)', delay: '-3s', duration: '15s', anim: 'float-pattern-2', visibility: 'large-desktop', opacity: 0.10 },
    { type: 'icon', element: Brackets, size: 42, top: '48%', left: '30%', color: 'var(--info)', delay: '-8s', duration: '18s', anim: 'float-pattern-3', visibility: 'large-desktop', opacity: 0.09 }
  ];

  return (
    <>
      <style>{`
        .floating-tech-bg-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          z-index: 1;
          pointer-events: none;
          user-select: none;
        }

        .floating-tech-element {
          position: absolute;
          will-change: transform;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: monospace;
          font-weight: bold;
        }

        @keyframes float-pattern-1 {
          0% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(25px, -45px, 0) rotate(8deg); }
          100% { transform: translate3d(0, 0, 0) rotate(0deg); }
        }

        @keyframes float-pattern-2 {
          0% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(-35px, -30px, 0) rotate(-12deg); }
          100% { transform: translate3d(0, 0, 0) rotate(0deg); }
        }

        @keyframes float-pattern-3 {
          0% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(40px, 25px, 0) rotate(15deg); }
          100% { transform: translate3d(0, 0, 0) rotate(0deg); }
        }

        @keyframes float-pattern-4 {
          0% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(-30px, 45px, 0) rotate(-8deg); }
          100% { transform: translate3d(0, 0, 0) rotate(0deg); }
        }

        @keyframes float-pattern-5 {
          0% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(30px, -25px, 0) rotate(-10deg); }
          100% { transform: translate3d(0, 0, 0) rotate(0deg); }
        }

        @keyframes float-pattern-6 {
          0% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(-20px, -50px, 0) rotate(12deg); }
          100% { transform: translate3d(0, 0, 0) rotate(0deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          .floating-tech-element {
            animation: none !important;
            transform: none !important;
          }
        }

        @media (max-width: 480px) {
          .tablet-visible, .desktop-visible, .large-desktop-visible {
            display: none !important;
          }
        }

        @media (min-width: 481px) and (max-width: 1024px) {
          .desktop-visible, .large-desktop-visible {
            display: none !important;
          }
        }

        @media (max-width: 1400px) {
          .large-desktop-visible {
            display: none !important;
          }
        }
      `}</style>
      <div className="floating-tech-bg-container" aria-hidden="true">
        {items.map((item, idx) => {
          const IconComponent = item.type === 'icon' ? item.element : null;
          const classNames = `floating-tech-element ${item.visibility}-visible`;
          
          return (
            <div
              key={idx}
              className={classNames}
              style={{
                top: item.top,
                left: item.left,
                color: item.color,
                fontSize: item.size,
                opacity: item.opacity,
                animation: `${item.anim} ${item.duration} ease-in-out ${item.delay} infinite`,
              }}
            >
              {IconComponent ? <IconComponent size={item.size} /> : item.element}
            </div>
          );
        })}
      </div>
    </>
  );
}
