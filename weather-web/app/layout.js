import 'tailwindcss/tailwind.css';

const RootLayout = ({ children }) => {
  return (
    <html lang="en">
      <body>
        <div className="container mx-auto py-4">{children}</div>
      </body>
    </html>
  );
};

export default RootLayout;