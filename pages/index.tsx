import type { GetServerSideProps, NextPage } from 'next';

type PocProps = {
  userAgent: string;
  generatedAt: string;
};


export const getServerSideProps: GetServerSideProps<PocProps> = async (context) => {
  return {
    props: {
      userAgent: context.req.headers['user-agent'] || 'unknown',
      generatedAt: new Date().toISOString(),
    },
  };
};

const Poc: NextPage<PocProps> = ({ userAgent, generatedAt }) => {
  return (
    <div>
      <h1>SSR Page</h1>
      <p>Your User-Agent: {userAgent}</p>
      <p>Generated At (Server): {generatedAt}</p>
    </div>
  );
};

export default Poc;