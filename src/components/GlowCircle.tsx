import React, { useEffect, useMemo, useRef } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { WebView } from "react-native-webview";

type Props = { size?: number; onPress?: () => void };
export const GlowCircleWebView: React.FC<Props> = ({ size = 220, onPress }) => {
  // Native (iOS/Android): use WebView with inline HTML + shader
  const html = useMemo(
    () => `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no" />
  <style>
    html,body,canvas{height:100%;width:100%;margin:0;background:transparent;overflow:hidden;}
    body{display:flex;align-items:center;justify-content:center;}
  </style>
</head>
<body>
  <canvas id="glcanvas"></canvas>
  <script>
    const canvas=document.getElementById('glcanvas');
    const gl=canvas.getContext('webgl');
    const vert="attribute vec2 a_position;\nvoid main(){gl_Position=vec4(a_position,0.0,1.0);} ";
    const frag="precision mediump float;\n"+
      "uniform vec2 u_resolution;\n"+
      "uniform float u_time;\n"+
      "vec3 colA=vec3(0.486,0.235,0.929);\n"+
      "vec3 colB=vec3(0.012,0.714,0.831);\n"+
      "void main(){\n"+
      "  vec2 uv=gl_FragCoord.xy/u_resolution.xy;\n"+
      "  vec2 p=(uv-0.5)*vec2(u_resolution.x/u_resolution.y,1.0);\n"+
      "  float d=length(p);\n"+
      "  float wobble=0.05*sin(u_time*1.2+d*15.0);\n"+
      "  float t=smoothstep(0.0+wobble,0.9+wobble,1.0-d);\n"+
      "  float rings=0.03*sin(40.0*d-u_time*2.0);\n"+
      "  t+=rings;\n"+
      "  vec3 color=mix(colA,colB,t);\n"+
      "  float glow=pow(1.0-d,2.0);\n"+
      "  color+=0.35*glow;\n"+
      "  float vign=smoothstep(0.6,0.95,d);\n"+
      "  color*=1.0-0.2*vign;\n"+
      "  gl_FragColor=vec4(color,1.0);\n"+
      "}";
    function compile(type,src){
      const s=gl.createShader(type);
      gl.shaderSource(s,src);
      gl.compileShader(s);
      return s;
    }
    const v=compile(gl.VERTEX_SHADER,vert);
    const f=compile(gl.FRAGMENT_SHADER,frag);
    const prog=gl.createProgram();
    gl.attachShader(prog,v);
    gl.attachShader(prog,f);
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,buf);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    const pos=gl.getAttribLocation(prog,'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
    const u_res=gl.getUniformLocation(prog,'u_resolution');
    const u_time=gl.getUniformLocation(prog,'u_time');
    let start=performance.now();
    function render(){
      gl.viewport(0,0,canvas.width=canvas.clientWidth,canvas.height=canvas.clientHeight);
      gl.uniform2f(u_res,canvas.width,canvas.height);
      gl.uniform1f(u_time,(performance.now()-start)/1000);
      gl.drawArrays(gl.TRIANGLES,0,3);
      requestAnimationFrame(render);
    }
    render();
    canvas.addEventListener('click',()=>{window.ReactNativeWebView?.postMessage('clicked')});
  </script>
</body>
</html>`,
    [size]
  );

  // Web fallback: render a canvas and run the same shader directly
  const canvasRef = useRef<any>(null);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const canvas = canvasRef.current as HTMLCanvasElement | null;
    if (!canvas) return;
    const gl = canvas.getContext("webgl");
    if (!gl) return;
    const vert = "attribute vec2 a_position;\nvoid main(){gl_Position=vec4(a_position,0.0,1.0);} ";
    const frag =
      "precision mediump float;\n" +
      "uniform vec2 u_resolution;\n" +
      "uniform float u_time;\n" +
      "vec3 colA=vec3(0.486,0.235,0.929);\n" +
      "vec3 colB=vec3(0.012,0.714,0.831);\n" +
      "void main(){\n" +
      "  vec2 uv=gl_FragCoord.xy/u_resolution.xy;\n" +
      "  vec2 p=(uv-0.5)*vec2(u_resolution.x/u_resolution.y,1.0);\n" +
      "  float d=length(p);\n" +
      "  float wobble=0.05*sin(u_time*1.2+d*15.0);\n" +
      "  float t=smoothstep(0.0+wobble,0.9+wobble,1.0-d);\n" +
      "  float rings=0.03*sin(40.0*d-u_time*2.0);\n" +
      "  t+=rings;\n" +
      "  vec3 color=mix(colA,colB,t);\n" +
      "  float glow=pow(1.0-d,2.0);\n" +
      "  color+=0.35*glow;\n" +
      "  float vign=smoothstep(0.6,0.95,d);\n" +
      "  color*=1.0-0.2*vign;\n" +
      "  gl_FragColor=vec4(color,1.0);\n" +
      "}";
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const v = compile(gl.VERTEX_SHADER, vert);
    const f = compile(gl.FRAGMENT_SHADER, frag);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, v);
    gl.attachShader(prog, f);
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    const pos = gl.getAttribLocation(prog, "a_position");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    const u_res = gl.getUniformLocation(prog, "u_resolution");
    const u_time = gl.getUniformLocation(prog, "u_time");
    let start = performance.now();
    let raf = 0;
    const render = () => {
      // keep canvas sized to its CSS box
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width);
      canvas.height = Math.round(rect.height);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(u_res, canvas.width, canvas.height);
      gl.uniform1f(u_time, (performance.now() - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(render);
    };
    render();
    const handleClick = () => { if (onPress) onPress(); };
    canvas.addEventListener("click", handleClick);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("click", handleClick);
    };
  }, [size, onPress]);

  // Render per-platform
  if (Platform.OS === "web") {
    const Canvas = "canvas" as any;
    return (
      <View style={[styles.container, { width: size, height: size, borderRadius: size / 2, overflow: "hidden" }]}
        onTouchEnd={onPress}
      >
        <Canvas
          ref={canvasRef}
          style={{ width: "100%", height: "100%", backgroundColor: "transparent", display: "block" }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2, overflow: "hidden" }]}>
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        style={{ backgroundColor: "transparent" }}
        javaScriptEnabled
        domStorageEnabled
        onMessage={(e) => {
          if (e.nativeEvent.data === "clicked" && onPress) onPress();
        }}
        {...(Platform.OS === "android" ? { androidHardwareAccelerationDisabled: false } : {})}
      />
    </View>
  );
};
const styles=StyleSheet.create({container:{alignItems:'center',justifyContent:'center'}});
export default GlowCircleWebView;