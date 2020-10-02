import { Money, Numeral } from "@arkecosystem/platform-sdk-intl";
import { BigNumber } from "@arkecosystem/platform-sdk-support";
import { CURRENCIES } from "@arkecosystem/platform-sdk/dist/data";
import React from "react";

type AmountProps = {
	ticker: string;
	value: BigNumber;
	locale?: string;
	showNegativeSign?: boolean;
};
type FormatProps = AmountProps & { decimals: number };
type Props = AmountProps & Omit<React.HTMLProps<any>, "value">;

type CurrencyConfig = {
	symbol: string;
	decimals: number;
};

type ExchangeCurrencyList = keyof typeof CURRENCIES;

const formatFiat = ({ ticker, value, decimals }: FormatProps): string => {
	const cents = value.times(Math.pow(10, decimals)).decimalPlaces(0).toNumber();
	const money = Money.make(cents, ticker);
	return money.format();
};

const formatCrypto = ({ ticker, value, decimals, locale }: FormatProps): string => {
	const human = value.toHuman(decimals);
	const numeral = Numeral.make(locale!, {
		minimumFractionDigits: 0,
		maximumFractionDigits: decimals,
		currencyDisplay: "name",
	}).formatAsCurrency(+human, "BTC");

	/**
	 * Intl.NumberFormat throws error for some tickers like DARK (?)
	 */
	const money = numeral.replace("BTC", ticker.toUpperCase());
	return money;
};

export const Amount = ({ ticker, value, locale, showNegativeSign, ...props }: Props) => {
	const tickerConfig: CurrencyConfig | undefined = CURRENCIES[ticker as ExchangeCurrencyList];
	const decimals = tickerConfig?.decimals || 8;
	const isFiat = decimals <= 2;
	const amount = (isFiat ? formatFiat : formatCrypto)({ ticker, value, locale, decimals });

	return (
		<span data-testid="Amount" {...props}>
			{showNegativeSign ? `- ${amount}`: amount}
		</span>
	);
};

Amount.defaultProps = {
	locale: "en",
};
