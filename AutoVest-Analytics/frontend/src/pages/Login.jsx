import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const getErrorMessage = (error) => {
    if (!error?.response) {
      return "Cannot reach server at http://127.0.0.1:8000. Start backend and try again.";
    }
    const status = error.response.status;
    const data = error.response.data;
    const prefix = `[${status}] `;
    if (!data) return prefix + "Request failed";
    if (typeof data === "string") return prefix + data;
    if (data.detail) return prefix + data.detail;
    if (Array.isArray(data.password) && data.password.length) return prefix + data.password[0];
    if (Array.isArray(data.username) && data.username.length) return prefix + data.username[0];
    const firstKey = Object.keys(data)[0];
    if (firstKey) {
      const val = data[firstKey];
      if (Array.isArray(val) && val.length) return prefix + val[0];
      if (typeof val === "string") return prefix + val;
    }
    return prefix + "Request failed";
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setSuccess("");

    try {
      if (isSignup) {
        await signup(username, password);
        await login(username, password);
        setSuccess("Successfully signed up and logged in.");
        setTimeout(() => navigate("/portfolio", { replace: true }), 700);
        return;
      }

      await login(username, password);
      setSuccess("Successfully logged in.");
      setTimeout(() => navigate("/portfolio", { replace: true }), 700);
    } catch (error) {
      setErr(getErrorMessage(error));
    }
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center px-6 py-10"
      style={{
        background:
          "radial-gradient(circle at 15% 20%, rgba(125, 211, 252, 0.28), transparent 35%), radial-gradient(circle at 85% 15%, rgba(59, 130, 246, 0.24), transparent 32%), linear-gradient(145deg, #0f172a 0%, #1e3a8a 45%, #0b4f6c 100%)",
      }}
    >
      {success && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          {success}
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className="w-full max-w-[440px] rounded-2xl bg-white/95 px-8 py-9 shadow-2xl border border-white/40"
      >
        <div className="mb-8">
          <h1 className="text-center text-[30px] text-slate-800 font-semibold tracking-tight">
            {isSignup ? "Create Account" : "Welcome Back"}
          </h1>
          <p className="text-center text-sm text-slate-500 mt-2">
            {isSignup ? "Sign up to continue" : "Login to continue"}
          </p>
        </div>

        <div className="mb-5">
          <label className="block text-[12px] text-slate-600 mb-2 font-medium">Username</label>
          <input
            className="w-full h-11 rounded-xl px-4 bg-slate-100 text-slate-700 outline-none border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-[12px] text-slate-600 mb-2 font-medium">Password</label>
          <input
            className="w-full h-11 rounded-xl px-4 bg-slate-100 text-slate-700 outline-none border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div className="text-right mt-3 text-xs italic text-slate-500">Forgot Password?</div>
        {err && <div className="mt-4 text-sm text-red-600">{err}</div>}

        <button
          type="submit"
          className="w-full h-11 rounded-xl mt-7 bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white font-semibold tracking-[0.08em] hover:from-[#1d4ed8] hover:to-[#1e40af] transition-colors"
        >
          {isSignup ? "SIGN UP" : "LOGIN"}
        </button>

        <div className="mt-6 text-center text-[12px] text-slate-500">
          {isSignup ? "Already have an account? " : "Don't have an account? "}
          <button
            type="button"
            onClick={() => {
              setErr("");
              setIsSignup((v) => !v);
            }}
            className="text-blue-700 font-semibold hover:text-blue-800"
          >
            {isSignup ? "login" : "signup"}
          </button>
        </div>
      </form>
    </main>
  );
}
