import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
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
    if (submitting) return;
    setErr("");
    setSuccess("");
    setSubmitting(true);

    try {
      if (isSignup) {
        let createdNewUser = true;
        try {
          await signup(username, password);
        } catch (signupError) {
          const usernameErrors = signupError?.response?.data?.username;
          const firstUsernameError = Array.isArray(usernameErrors) ? usernameErrors[0] : "";
          const isExistingUserError =
            signupError?.response?.status === 400 &&
            typeof firstUsernameError === "string" &&
            firstUsernameError.toLowerCase().includes("already exists");

          if (!isExistingUserError) throw signupError;
          createdNewUser = false;
        }
        await login(username, password);
        setSuccess(
          createdNewUser
            ? "Successfully signed up and logged in."
            : "Account already exists. Logged in successfully."
        );
        setTimeout(() => navigate("/portfolio", { replace: true }), 700);
        return;
      }

      await login(username, password);
      setSuccess("Successfully logged in.");
      setTimeout(() => navigate("/portfolio", { replace: true }), 700);
    } catch (error) {
      setErr(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center px-6 py-10 font-['Poppins',sans-serif] animate-fadeIn"
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #3b0764 100%)",
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.8s ease-out forwards;
        }
        .login-card {
          backdrop-filter: blur(10px);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .login-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .input-field {
          transition: all 0.3s ease;
        }
        .input-field:focus {
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.2);
        }
        .login-button {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          background: linear-gradient(90deg, #6366f1 0%, #a855f7 100%);
        }
        .login-button:hover {
          transform: scale(1.02);
          filter: brightness(1.1);
          box-shadow: 0 10px 15px -3px rgba(168, 85, 247, 0.4);
        }
        .login-button:active {
          transform: scale(0.98);
        }
      `}</style>

      {success && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-2xl text-sm font-medium animate-fadeIn">
          {success}
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className="w-full max-w-[420px] rounded-[2rem] bg-white/95 px-10 py-12 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/20 login-card"
      >
        <div className="mb-10 text-center">
          <h1 className="text-3xl text-slate-900 font-bold tracking-tight mb-2">
            {isSignup ? "Create Account" : "Welcome Back"}
          </h1>
          <p className="text-slate-500 font-medium">
            {isSignup ? "Sign up to start your journey" : "Please enter your details to login"}
          </p>
        </div>

        <div className="space-y-6">
          <div className="relative group">
            <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">Username</label>
            <input
              className="w-full h-12 rounded-2xl px-5 bg-slate-50 text-slate-800 outline-none border-2 border-slate-100 focus:border-indigo-400 input-field"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="relative group">
            <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">Password</label>
            <input
              className="w-full h-12 rounded-2xl px-5 bg-slate-50 text-slate-800 outline-none border-2 border-slate-100 focus:border-indigo-400 input-field"
              placeholder="Enter your password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <button type="button" className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer">
            Forgot Password?
          </button>
        </div>

        {err && (
          <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 font-medium">
            {err}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full h-14 rounded-2xl mt-8 text-white font-bold tracking-wide login-button shadow-lg shadow-indigo-200"
        >
          {submitting ? "PROCESSING..." : isSignup ? "CREATE ACCOUNT" : "SIGN IN"}
        </button>

        <div className="mt-8 text-center text-sm font-medium text-slate-600">
          {isSignup ? "Already have an account? " : "Don't have an account? "}
          <button
            type="button"
            onClick={() => {
              setErr("");
              setIsSignup((v) => !v);
            }}
            className="text-indigo-600 font-bold hover:underline ml-1"
          >
            {isSignup ? "Login here" : "Sign up for free"}
          </button>
        </div>
      </form>
    </main>
  );
}
