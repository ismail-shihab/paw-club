import React, { useState, useEffect, useRef } from "react";

const SUPABASE_FUNCTION_URL =
  import.meta.env.VITE_SUPABASE_URL
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hyper-worker`
    : "https://nuhlfmcpydfrfmneiiht.supabase.co/functions/v1/hyper-worker";

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";
const MERCHANT_NUMBER = "01622783078";
const SUPPORT_WHATSAPP = "8801613336011";

export default function CheckoutView({
  cart = [],
  subtotal = 0,
  deliveryFee = 60,
  onBack,
  onClearCart,
}) {
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("Inside Dhaka");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("bKash");
  const [txId, setTxId] = useState("");
  const [copiedNumber, setCopiedNumber] = useState(false);

  const [turnstileToken, setTurnstileToken] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Friendly inline banner state (never shows error codes)
  const [notice, setNotice] = useState(null); // { type: 'info' | 'warning' | 'success', text: string }

  // Live payment verification & confirmation states
  const [verifyingOrder, setVerifyingOrder] = useState(null); // { code, secondsLeft }
  const [confirmedOrder, setConfirmedOrder] = useState(null); // { code, status }

  const turnstileRef = useRef(null);
  const widgetIdRef = useRef(null);

  const computedDelivery = area === "Inside Dhaka" ? 60 : 120;
  const effectiveDelivery = typeof deliveryFee === "number" ? deliveryFee : computedDelivery;
  const total = Number(subtotal) + Number(effectiveDelivery);

  // Render Cloudflare Turnstile widget cleanly
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !turnstileRef.current || !window.turnstile) return;
    if (widgetIdRef.current !== null) return;

    widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: "light",
      callback: (token) => setTurnstileToken(token),
      "expired-callback": () => setTurnstileToken(""),
      "error-callback": () => setTurnstileToken(""),
    });

    return () => {
      if (widgetIdRef.current !== null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []);

  // Poll order status every 3s while waiting for SMS forwarder
  useEffect(() => {
    if (!verifyingOrder?.code) return;

    const countdown = setInterval(() => {
      setVerifyingOrder((prev) => {
        if (!prev) return null;
        if (prev.secondsLeft <= 1) return { ...prev, secondsLeft: 0 };
        return { ...prev, secondsLeft: prev.secondsLeft - 1 };
      });
    }, 1000);

    const poller = setInterval(async () => {
      try {
        const res = await fetch(SUPABASE_FUNCTION_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(SUPABASE_ANON_KEY ? { apikey: SUPABASE_ANON_KEY } : {}),
          },
          body: JSON.stringify({
            action: "check_status",
            code: verifyingOrder.code,
          }),
        });
        const data = await res.json();
        if (data?.status === "Processing" || data?.status === "Delivered") {
          clearInterval(poller);
          clearInterval(countdown);
          setVerifyingOrder(null);
          setConfirmedOrder({ code: verifyingOrder.code, status: "Processing" });
          if (onClearCart) onClearCart();
        }
      } catch {
        // Ignore transient network blips during background polling
      }
    }, 3000);

    return () => {
      clearInterval(poller);
      clearInterval(countdown);
    };
  }, [verifyingOrder?.code, onClearCart]);

  const handleCopyNumber = () => {
    navigator.clipboard?.writeText(MERCHANT_NUMBER);
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2000);
  };

  const resetTurnstile = () => {
    setTurnstileToken("");
    if (widgetIdRef.current !== null && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  };

  const handlePlaceOrder = async (e) => {
    if (e) e.preventDefault();
    setNotice(null);

    if (!customerName.trim() || !phone.trim() || !address.trim()) {
      setNotice({
        type: "warning",
        text: "Please enter your name, mobile number, and full delivery address to continue.",
      });
      return;
    }

    const cleanPhone = phone.replace(/\s+/g, "");
    if (!/^01[3-9]\d{8}$/.test(cleanPhone)) {
      setNotice({
        type: "warning",
        text: "Please check your mobile number — it should be 11 digits starting with 01.",
      });
      return;
    }

    if ((paymentMethod === "bKash" || paymentMethod === "Nagad") && txId.trim().length < 6) {
      setNotice({
        type: "warning",
        text: `Please paste the Transaction ID (TrxID) from your ${paymentMethod} payment SMS.`,
      });
      return;
    }

    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setNotice({
        type: "info",
        text: "Please wait a moment for the security check box below to finish verifying.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(SUPABASE_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(SUPABASE_ANON_KEY ? { apikey: SUPABASE_ANON_KEY } : {}),
        },
        body: JSON.stringify({
          customer_name: customerName.trim(),
          phone: cleanPhone,
          area,
          address: address.trim(),
          notes: notes.trim(),
          items: cart,
          subtotal,
          delivery_fee: effectiveDelivery,
          total,
          payment_method: paymentMethod,
          tx_id: paymentMethod === "COD" ? null : txId.trim().toUpperCase(),
          turnstile_token: turnstileToken,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        resetTurnstile();
        setNotice({
          type: "warning",
          text:
            data?.userMessage ||
            "We couldn't complete that right now. Please wait a few seconds and tap Place order again.",
        });
        setSubmitting(false);
        return;
      }

      // If SMS is still on the way, show live automatic waiting screen
      if (data.pending && (paymentMethod === "bKash" || paymentMethod === "Nagad")) {
        setSubmitting(false);
        setVerifyingOrder({ code: data.code, secondsLeft: 60 });
        return;
      }

      // Confirmed immediately (COD or instant SMS match)
      setSubmitting(false);
      setConfirmedOrder({ code: data.code, status: data.status || "Processing" });
      if (onClearCart) onClearCart();
    } catch {
      resetTurnstile();
      setSubmitting(false);
      setNotice({
        type: "warning",
        text: "Your internet connection looks unstable. Please check your connection and try again.",
      });
    }
  };

  // 1. GREEN ORDER CONFIRMED SCREEN
  if (confirmedOrder) {
    return (
      <div className="max-w-lg mx-auto my-8 p-6 rounded-3xl bg-[#FFFDF7] border-2 border-[#2D241E] shadow-[4px_4px_0px_#2D241E] text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 border-2 border-[#2D241E] flex items-center justify-center text-3xl">
          🐾
        </div>
        <h2 className="text-2xl font-extrabold text-[#1E3A2F] mb-2">Order Placed!</h2>
        <p className="text-sm text-[#4A3F35] mb-4">
          Thank you, <span className="font-bold">{customerName}</span>! Your Paw Club order is
          confirmed and being prepared for dispatch.
        </p>

        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 mb-5">
          <div className="text-xs uppercase tracking-wider text-emerald-800 font-semibold">
            Order Reference
          </div>
          <div className="text-xl font-black text-[#1E3A2F] mt-0.5">{confirmedOrder.code}</div>
          <div className="text-xs text-emerald-700 mt-1">
            Total Paid / Payable: <span className="font-bold">৳{total}</span> ({paymentMethod})
          </div>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="w-full py-3 rounded-full bg-[#1E3A2F] text-white font-bold border-2 border-[#2D241E] hover:opacity-95 transition"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  // 2. LIVE PAYMENT SMS WAITING SCREEN (No scary errors while SMS arrives)
  if (verifyingOrder) {
    const timedOut = verifyingOrder.secondsLeft === 0;
    const whatsappText = encodeURIComponent(
      `Hi Paw Club! I just placed order ${verifyingOrder.code} (Total ৳${total}) via ${paymentMethod} with TrxID ${txId
        .trim()
        .toUpperCase()}. Please confirm my payment.`
    );

    return (
      <div className="max-w-lg mx-auto my-8 p-6 rounded-3xl bg-[#FFFDF7] border-2 border-[#2D241E] shadow-[4px_4px_0px_#2D241E] text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 border-2 border-[#2D241E] flex items-center justify-center text-3xl animate-pulse">
          🐾
        </div>

        {!timedOut ? (
          <>
            <h2 className="text-xl font-extrabold text-[#1E3A2F] mb-2">
              Verifying Your {paymentMethod} Payment...
            </h2>
            <p className="text-sm text-[#4A3F35] mb-4">
              Your order <span className="font-bold">#{verifyingOrder.code}</span> is saved! We're
              waiting for your {paymentMethod} confirmation SMS to arrive. This screen will update
              automatically in a few seconds.
            </p>
            <div className="inline-block px-4 py-1.5 rounded-full bg-amber-50 border border-amber-300 text-xs font-semibold text-amber-900 mb-4">
              Auto-checking... ({verifyingOrder.secondsLeft}s)
            </div>
            <p className="text-xs text-[#6B5E53]">
              Please keep this tab open — no need to send money or submit again.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-xl font-extrabold text-[#1E3A2F] mb-2">
              Order Saved — Confirming Shortly
            </h2>
            <p className="text-sm text-[#4A3F35] mb-4">
              Your order <span className="font-bold">#{verifyingOrder.code}</span> is safely
              recorded with TrxID <span className="font-bold">{txId.trim().toUpperCase()}</span>.
              Mobile network SMS delivery is taking a little longer than usual, so our team will
              confirm it automatically as soon as the SMS arrives.
            </p>

            <div className="flex flex-col gap-2.5">
              <a
                href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${whatsappText}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 rounded-full bg-[#25D366] text-[#1E3A2F] font-bold border-2 border-[#2D241E] text-sm"
              >
                Message Paw Club on WhatsApp for Instant Check
              </a>
              <button
                type="button"
                onClick={onBack}
                className="w-full py-2.5 rounded-full bg-white text-[#2D241E] font-semibold border-2 border-[#2D241E] text-sm"
              >
                Back to Shop
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // 3. STANDARD CHECKOUT FORM
  return (
    <form onSubmit={handlePlaceOrder} className="max-w-xl mx-auto p-4 sm:p-6 space-y-5">
      {/* Delivery Details Card */}
      <div className="p-5 rounded-3xl bg-white border-2 border-[#2D241E] space-y-3.5">
        <h3 className="text-lg font-extrabold text-[#1E3A2F]">Delivery Details</h3>

        <div>
          <label className="block text-xs font-bold text-[#4A3F35] mb-1">Full Name *</label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Your name"
            className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#2D241E] text-sm focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-[#4A3F35] mb-1">Mobile Number *</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01XXXXXXXXX"
            className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#2D241E] text-sm focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-[#4A3F35] mb-1">Delivery Zone</label>
          <div className="grid grid-cols-2 gap-2.5">
            {["Inside Dhaka", "Outside Dhaka"].map((zone) => (
              <button
                key={zone}
                type="button"
                onClick={() => setArea(zone)}
                className={`py-2 px-3 rounded-xl text-xs font-bold border-2 border-[#2D241E] transition ${
                  area === zone ? "bg-[#1E3A2F] text-white" : "bg-[#FFFDF7] text-[#2D241E]"
                }`}
              >
                {zone} (৳{zone === "Inside Dhaka" ? 60 : 120})
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#4A3F35] mb-1">Full Address *</label>
          <textarea
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="House, Road, Area / Thana"
            className="w-full px-3.5 py-2 rounded-xl border-2 border-[#2D241E] text-sm focus:outline-none"
          />
        </div>
      </div>

      {/* Payment Card */}
      <div className="p-5 rounded-3xl bg-white border-2 border-[#2D241E] space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-[#1E3A2F]">Payment</h3>
          <span className="text-sm font-black text-[#1E3A2F]">Total: ৳{total}</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {["bKash", "Nagad", "COD"].map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => {
                setPaymentMethod(method);
                setNotice(null);
              }}
              className={`py-2.5 rounded-xl text-xs font-extrabold border-2 border-[#2D241E] transition ${
                paymentMethod === method
                  ? "bg-[#1E3A2F] text-white"
                  : "bg-[#FFFDF7] text-[#2D241E]"
              }`}
            >
              {method === "COD" ? "Cash on Delivery" : method}
            </button>
          ))}
        </div>

        {(paymentMethod === "bKash" || paymentMethod === "Nagad") && (
          <div className="p-3.5 rounded-2xl bg-[#FFFDF7] border border-[#2D241E]/30 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#4A3F35]">
                Send Money (<span className="font-bold">৳{total}</span>) to{" "}
                <span className="font-extrabold text-[#1E3A2F]">{MERCHANT_NUMBER}</span>
              </span>
              <button
                type="button"
                onClick={handleCopyNumber}
                className="px-2.5 py-1 rounded-lg bg-[#1E3A2F] text-white font-bold text-[11px]"
              >
                {copiedNumber ? "Copied!" : "Copy"}
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A3F35] mb-1">
                {paymentMethod} Transaction ID (TrxID) *
              </label>
              <input
                type="text"
                value={txId}
                onChange={(e) => setTxId(e.target.value)}
                placeholder="e.g. DKK8Q32W5A"
                className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#2D241E] text-sm uppercase font-semibold focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Cloudflare Turnstile */}
      {TURNSTILE_SITE_KEY && <div ref={turnstileRef} className="my-2" />}

      {/* Friendly User-Facing Notice Banner (No Error Codes) */}
      {notice && (
        <div
          className={`p-3.5 rounded-2xl border-2 border-[#2D241E] text-xs font-semibold flex items-start gap-2.5 ${
            notice.type === "warning"
              ? "bg-amber-50 text-amber-950"
              : "bg-sky-50 text-sky-950"
          }`}
        >
          <span className="text-base leading-none">🐾</span>
          <span>{notice.text}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="py-3 rounded-full bg-white text-[#2D241E] font-bold text-sm border-2 border-[#2D241E] hover:bg-stone-50 transition"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="py-3 rounded-full bg-[#6E8B74] text-white font-bold text-sm border-2 border-[#2D241E] hover:bg-[#5A7760] disabled:opacity-60 transition"
        >
          {submitting ? "Checking Payment..." : "Place order"}
        </button>
      </div>
    </form>
  );
}