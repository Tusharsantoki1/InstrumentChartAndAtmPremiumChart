import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import IndexPage from "./pages/IndexPage";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import "./market.css";


const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <IndexPage />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;