import React, { useEffect, useRef, useState } from "react";
import createGlobe from "cobe";
export function Gradient() {
  const canvas = useRef(null);
  useEffect(() => {
    const c = canvas.current,
      gl = c.getContext("webgl");
    if (!gl) return;
    const shader = (type, source) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, source);
      gl.compileShader(s);
      return s;
    };
    const vs = shader(
      gl.VERTEX_SHADER,
      "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}",
    );
    const fs = shader(
      gl.FRAGMENT_SHADER,
      `precision mediump float;uniform vec2 resolution;uniform float time;void main(){vec2 uv=gl_FragCoord.xy/resolution;float a=sin(uv.x*5.+time*.13)+cos(uv.y*4.-time*.1);float b=sin(length(uv-vec2(.73,.5))*7.-time*.1);vec3 col=mix(vec3(.055,.105,.09),vec3(.22,.34,.19),smoothstep(-1.5,1.8,a+b));gl_FragColor=vec4(col,1.);}`,
    );
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const p = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(p);
    gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);
    const res = gl.getUniformLocation(program, "resolution"),
      time = gl.getUniformLocation(program, "time");
    let raf;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let last = 0;
    const render = (t) => {
      if (t - last > 40 || !last) {
        last = t;
        c.width = c.clientWidth;
        c.height = c.clientHeight;
        gl.viewport(0, 0, c.width, c.height);
        gl.uniform2f(res, c.width, c.height);
        gl.uniform1f(time, reduced ? 0 : t / 1000);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      if (!reduced) raf = requestAnimationFrame(render);
    };
    render(1);
    return () => {
      cancelAnimationFrame(raf);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);
  return <canvas ref={canvas} className="shader" aria-hidden="true" />;
}
export function Globe({ prospects, selected, onSelect, large = false }) {
  const canvas = useRef(null),
    wrap = useRef(null),
    [failed, setFailed] = useState(false);
  const points = prospects.filter((p) => p.coordinates?.length);
  useEffect(() => {
    let globe,
      rotation = -0.14,
      width = 500;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const observer = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width;
    });
    observer.observe(wrap.current);
    let dragging = false,
      previous = 0;
    const c = canvas.current;
    const down = (e) => {
      dragging = true;
      previous = e.clientX;
      c.setPointerCapture(e.pointerId);
    };
    const move = (e) => {
      if (dragging) {
        rotation += (e.clientX - previous) / 160;
        previous = e.clientX;
      }
    };
    const up = () => {
      dragging = false;
    };
    c.addEventListener("pointerdown", down);
    c.addEventListener("pointermove", move);
    c.addEventListener("pointerup", up);
    try {
      globe = createGlobe(c, {
        devicePixelRatio: Math.min(window.devicePixelRatio, 2),
        width: 1000,
        height: 1000,
        phi: rotation,
        theta: 0.55,
        dark: 1,
        diffuse: 1.7,
        mapSamples: 16000,
        mapBrightness: 5.8,
        baseColor: [0.15, 0.21, 0.18],
        markerColor: [0.78, 0.91, 0.43],
        glowColor: [0.08, 0.14, 0.11],
        markers: points
          .slice(0, 1600)
          .map((p) => ({
            location: [p.coordinates[0].lat, p.coordinates[0].lng],
            size: selected?.id === p.id ? 0.095 : 0.018,
          })),
        onRender: (state) => {
          if (!dragging && !reduced) rotation += 0.0009;
          state.phi = rotation;
          state.width = width * Math.min(window.devicePixelRatio, 2);
          state.height = width * Math.min(window.devicePixelRatio, 2);
        },
      });
    } catch {
      setFailed(true);
    }
    return () => {
      observer.disconnect();
      globe?.destroy();
      c.removeEventListener("pointerdown", down);
      c.removeEventListener("pointermove", move);
      c.removeEventListener("pointerup", up);
    };
  }, [prospects, selected?.id]);
  return (
    <div ref={wrap} className={"globe-wrap " + (large ? "large" : "")}>
      <canvas
        ref={canvas}
        aria-label="Interactive globe of source-listed prospect locations. Drag to rotate."
      />
      {failed && (
        <p>Globe rendering is unavailable. Use the location list below.</p>
      )}
      <span className="globe-label">
        <i />
        {points.length.toLocaleString()} mapped companies · drag to rotate
      </span>
    </div>
  );
}
