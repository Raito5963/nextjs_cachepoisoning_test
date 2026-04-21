import type { GetServerSideProps, NextPage } from 'next';

type PocProps = {
  userAgent: string;
};


export const getServerSideProps: GetServerSideProps<PocProps> = async (context) => {
  return {
    props: {
      userAgent: context.req.headers['user-agent'] || 'unknown',
    },
  };
};

const Poc: NextPage<PocProps> = ({ userAgent }) => {
  return (
    <div>
      <h1>SSR Page</h1>
      <p>Your User-Agent: {userAgent}</p>
    </div>
  );
};

export default Poc;