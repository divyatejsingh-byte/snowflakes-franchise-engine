import ChatbotWidget from "@/components/ChatbotWidget";
import EnquiryPanel from "@/components/EnquiryPanel";

export const metadata = { title: "Enquiry & Support — SnowFlakes" };

export default function EnquiryPage() {
  return (
    <>
      <EnquiryPanel />
      <ChatbotWidget />
    </>
  );
}
