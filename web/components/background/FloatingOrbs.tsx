export function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {/* Deep blue orbs */}
      <div
        className="absolute rounded-full animate-float-slow animate-pulse-glow"
        style={{
          width: 640,
          height: 640,
          top: '-10%',
          left: '-8%',
          background: 'radial-gradient(circle, rgba(21,40,73,0.7) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      <div
        className="absolute rounded-full animate-float-medium"
        style={{
          width: 500,
          height: 500,
          top: '40%',
          right: '-6%',
          background: 'radial-gradient(circle, rgba(13,29,62,0.6) 0%, transparent 70%)',
          filter: 'blur(50px)',
          animationDelay: '-6s',
        }}
      />
      {/* Gold accent orbs — very subtle */}
      <div
        className="absolute rounded-full animate-float-fast"
        style={{
          width: 280,
          height: 280,
          top: '20%',
          right: '15%',
          background: 'radial-gradient(circle, rgba(212,175,55,0.07) 0%, transparent 70%)',
          filter: 'blur(40px)',
          animationDelay: '-3s',
        }}
      />
      <div
        className="absolute rounded-full animate-float-slow"
        style={{
          width: 360,
          height: 360,
          bottom: '10%',
          left: '20%',
          background: 'radial-gradient(circle, rgba(212,175,55,0.05) 0%, transparent 70%)',
          filter: 'blur(50px)',
          animationDelay: '-10s',
        }}
      />
      {/* Extra depth */}
      <div
        className="absolute rounded-full animate-float-medium"
        style={{
          width: 800,
          height: 800,
          bottom: '-20%',
          right: '-10%',
          background: 'radial-gradient(circle, rgba(7,15,39,0.8) 0%, transparent 70%)',
          filter: 'blur(80px)',
          animationDelay: '-14s',
        }}
      />
    </div>
  );
}
