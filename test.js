const { ethers } = require("hardhat");
const helpers = require("@nomicfoundation/hardhat-network-helpers");

async function simulate(){
    //Compound USDC v3 contract address and needed abi
    const CometAddress = '0xc3d688B66703497DAA19211EEdff47f25384cdc3';
    const CometAbi = [
        "function supply(address asset, uint amount) external",
        "function withdraw(address asset, uint amount) external"
    ];

    //USDC token address and needed abi
    const USDCAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
    const USDCAbi = [
        "function balanceOf(address account) external view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)",
    ];

    //WETH token address and needed abi
    const WETHAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
    const WETHAbi = [
        "function balanceOf(address account) public view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)",
    ];

    //Impersonate a signer and initialize instances of Comet, USDC and WETH contracts using the defined addresses and ABIs.
    const SignerAddress = "0x40c1c867A179f2fDe9d925652749FdC66228e78a";
    await helpers.impersonateAccount(SignerAddress);
    const ImpersonatedSigner = await ethers.getSigner(SignerAddress);
    const Comet = new ethers.Contract(CometAddress, CometAbi, ImpersonatedSigner);
    const USDC = new ethers.Contract(USDCAddress, USDCAbi, ImpersonatedSigner);
    const WETH = new ethers.Contract(WETHAddress, WETHAbi, ImpersonatedSigner);

    //[Print] the init USDC balance in Comet contract
    const init_USDCbalance = await USDC.balanceOf(CometAddress);
    console.log('init USDC Balance:                         ', ethers.utils.formatUnits(init_USDCbalance.toString(),6));

    //Impersonate a USDC whale address as Alice
    const aliceAddress = "0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503";
    await helpers.impersonateAccount(aliceAddress);
    const aliceImpersonatedSigner = await ethers.getSigner(aliceAddress);
    
    //Alice supply 1000 USDC to Comet (after approving Comet), then [Print] the USDC balance in Comet
    await USDC.connect(aliceImpersonatedSigner).approve(CometAddress, ethers.utils.parseUnits("1000",6));
    await Comet.connect(aliceImpersonatedSigner).supply(USDCAddress, ethers.utils.parseUnits("1000",6));
    const balance_AfterAliceProvideLiquidity = await USDC.balanceOf(CometAddress);
    console.log('USDC Balance after Alice provide 1000 USDC:', ethers.utils.formatUnits(balance_AfterAliceProvideLiquidity.toString(),6));
    
    //Some settings up:
    //Bob can withdraw all of USDC only if he first provide enormous collateral (Here I use WETH)
    //Impersonate a WETH whale address as Bob and get the total WETH amount in his wallet
    const bobAddress = "0x8EB8a3b98659Cce290402893d0123abb75E3ab28";
    await helpers.impersonateAccount(bobAddress);
    const bobImpersonatedSigner = await ethers.getSigner(bobAddress);
    const bob_totalWETHbalance = await WETH.balanceOf(bobAddress);

    //Bob supply all of his WETH to Comet as collacteral (after approving Comet)
    await WETH.connect(bobImpersonatedSigner).approve(CometAddress, bob_totalWETHbalance);
    await Comet.connect(bobImpersonatedSigner).supply(WETHAddress, bob_totalWETHbalance );

    //Bob withdraw all of USDC in Comet, then [Print] the USDC balance in Comet
    await Comet.connect(bobImpersonatedSigner).withdraw(USDCAddress, balance_AfterAliceProvideLiquidity);
    const balance_AfteBobWithdrawAllUSDC = await USDC.balanceOf(CometAddress);
    console.log('USDC Balance after Bob Withdraw all USDC:', ethers.utils.formatUnits(balance_AfteBobWithdrawAllUSDC.toString(),6));

    //[Print] Alice tries to withdraw 1000 USDC, record what happened and print those out
    console.log('When Alice tries to withdraw 1000 USDC, this will happen:');
    try{ await Comet.connect(aliceImpersonatedSigner).withdraw(USDCAddress, ethers.utils.parseUnits("1000",6)); }
    catch(e){ err = e.message; }
    console.log(err);
}

simulate().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
