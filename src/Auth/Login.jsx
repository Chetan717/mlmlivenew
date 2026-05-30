"use client";
import { useState, useRef } from "react";
import {
  Button,
  FieldError,
  Form,
  Input,
  Label,
  TextField,
} from "@heroui/react";
import logo from "/mlmboo2.ico";
import { InputOTP } from "@heroui/react";
import { useNavigate } from "react-router";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@firebase-config";
import { toast } from "@heroui/react";

export function Login() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [pin, setPin] = useState("");
  const [lockout, setLockout] = useState(0);
  const failCountRef = useRef(0);

  const onSubmit = async (e) => {
    e.preventDefault();

    if (lockout > Date.now()) {
      const secs = Math.ceil((lockout - Date.now()) / 1000);
      setFormError(`Too many failed attempts. Try again in ${secs}s.`);
      return;
    }
    const formData = new FormData(e.currentTarget);
    const data = {};
    formData.forEach((value, key) => {
      data[key] = value.toString().trim();
    });

    if (!/^[0-9]{10}$/.test(data.mobile)) {
      setFormError("Please enter a valid 10-digit mobile number");
      return;
    }
    if (!/^[0-9]{4}$/.test(pin)) {
      setFormError("Please enter a valid 4-digit PIN");
      return;
    }

    try {
      setLoading(true);
      setFormError("");

      const q = query(
        collection(db, "users"),
        where("mobileNo", "==", data.mobile)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setFormError("No account found with this mobile number");
        return;
      }

      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();

      if (!userData.isverified) {
        setFormError("Account not verified. Please signup again.");
        return;
      }

      if (userData.password !== pin) {
        failCountRef.current += 1;
        if (failCountRef.current >= 5) {
          const until = Date.now() + 30_000;
          setLockout(until);
          failCountRef.current = 0;
          setFormError("Too many failed attempts. Please wait 30 seconds.");
        } else {
          setFormError(`Incorrect PIN. Please try again. (${failCountRef.current}/5)`);
        }
        return;
      }
      failCountRef.current = 0;
      setLockout(0);

      const userToStore = {
        id: userDoc.id,
        name: userData.name,
        mobileNo: userData.mobileNo,
        isverified: userData.isverified,
        createdAt: userData.createdAt?.toDate?.()?.toISOString() ?? "",
        referCode: userData.referCode ?? "",
        referredBy: userData.referredBy ?? null,
        referCredit: userData.referCredit ?? 0,
      };

      localStorage.setItem("usermlm", JSON.stringify(userToStore));

      const profileQuery = query(
        collection(db, "mlmprofiles"),
        where("mobile", "==", data.mobile)
      );
      const profileSnapshot = await getDocs(profileQuery);

      if (!profileSnapshot.empty) {
        const profileDoc = profileSnapshot.docs[0];
        localStorage.setItem(
          "mlmProfile",
          JSON.stringify({ id: profileDoc.id, ...profileDoc.data() })
        );
        toast.success("Login Successful!");
        navigate("/");
      } else {
        toast.success("Login Successful!");
        navigate("/selectcomp");
      }
    } catch (error) {
      console.error("Login Error:", error);
      setFormError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background relative overflow-hidden">

      {/* Hero gradient header */}
      <div className="relative h-[280px] md:h-[320px] bg-accent overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-accent via-[#1a3a8f] to-[#0a1744]" />
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute top-8 right-8 w-20 h-20 rounded-full bg-white/5" />

        <div className="relative z-10 flex flex-col items-center justify-center h-full gap-4 px-6">
          <div className="w-20 h-20 bg-white rounded-[20px] shadow-2xl flex items-center justify-center border-2 border-white/20 p-2">
            <img src={logo} alt="MLM LIVE" className="w-full h-full object-contain" />
          </div>
          <div className="text-center">
            <h1 className="text-white font-display font-bold text-2xl leading-tight">
              Welcome Back
            </h1>
            <p className="text-white/70 text-sm mt-1 font-medium">
              Sign in to continue to MLM LIVE
            </p>
          </div>
        </div>

        {/* Curved bottom edge */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-background rounded-t-[32px]" />
      </div>

      {/* Form card */}
      <div className="flex-1 flex flex-col items-center px-6 pt-2 pb-8 bg-background -mt-1">
        <div className="w-full max-w-sm">
          <Form className="flex w-full flex-col gap-5" onSubmit={onSubmit}>

            {/* Mobile */}
            <TextField name="mobile" type="tel" className="w-full">
              <Label className="font-semibold text-sm text-foreground/80 mb-1.5 block">
                Mobile Number
              </Label>
              <Input
                className="w-full"
                classNames={{
                  inputWrapper:
                    "h-13 bg-white dark:bg-black/20 border border-border hover:border-accent focus-within:!border-accent focus-within:!ring-accent shadow-sm rounded-xl",
                  input: "text-base font-medium tracking-wide",
                }}
                placeholder="Enter your 10-digit number"
                maxLength={10}
              />
              <FieldError className="text-danger mt-1 text-xs" />
            </TextField>

            {/* PIN */}
            <div className="flex flex-col gap-1 w-full">
              <div className="flex justify-between items-center mb-1.5">
                <Label className="font-semibold text-sm text-foreground/80">
                  4-Digit PIN
                </Label>
                <span
                  onClick={() => navigate("/forgetpin")}
                  className="text-xs text-accent font-bold cursor-pointer hover:underline"
                >
                  Forgot PIN?
                </span>
              </div>
              <InputOTP
                name="pin"
                maxLength={4}
                value={pin}
                onChange={(val) => setPin(val)}
              >
                <InputOTP.Group className="gap-3 w-full justify-between">
                  {[0, 1, 2, 3].map((i) => (
                    <InputOTP.Slot
                      key={i}
                      index={i}
                      className="flex-1 h-14 text-2xl font-bold bg-white dark:bg-black/20 border border-border data-[focus=true]:border-accent data-[focus=true]:ring-accent shadow-sm rounded-xl"
                    />
                  ))}
                </InputOTP.Group>
              </InputOTP>
            </div>

            {/* Error */}
            {formError && (
              <div className="bg-danger/10 border border-danger/20 text-danger text-sm text-center py-3 px-4 rounded-xl font-medium animate-in fade-in slide-in-from-top-2">
                {formError}
              </div>
            )}

            {/* Submit */}
            <Button
              className="w-full h-13 bg-accent hover:bg-accent/90 text-white font-bold text-base shadow-lg shadow-accent/25 rounded-xl mt-2"
              type="submit"
              isLoading={loading}
            >
              {loading ? "Logging in..." : "Login Now"}
            </Button>

            {/* Register */}
            <p className="text-center text-sm font-medium text-muted-foreground">
              Don't have an account?
              <span
                onClick={() => navigate("/signup")}
                className="ml-1.5 text-accent font-bold cursor-pointer hover:underline"
              >
                Register
              </span>
            </p>
          </Form>
        </div>
      </div>
    </div>
  );
}
