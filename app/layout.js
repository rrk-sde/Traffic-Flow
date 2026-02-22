import './globals.css';

export const metadata = {
  title: 'Traffic Flow Optimization Simulator',
  description: 'Simulate queue growth and optimize traffic signal timing using a cycle-based urban traffic model.',
  keywords: 'traffic simulation, signal timing, congestion reduction, queue model, intersection optimization',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
