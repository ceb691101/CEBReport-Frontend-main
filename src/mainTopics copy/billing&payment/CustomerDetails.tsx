import { useState } from "react";
import BillingForm from "../../components/mainTopics/billing&payments/customerDetails/Billing_Form";
import Ordinary_Biling_Chart_For_Units from "../../components/mainTopics/billing&payments/customerDetails/charts/Ordinary_Biling_Chart_For_Units";
import Ordinary_Billing_Chart_For_Amount from "../../components/mainTopics/billing&payments/customerDetails/charts/Ordinary_Billing_Chart_For_Amount";
import Ordinary_Billing_Chart_For_Balance from "../../components/mainTopics/billing&payments/customerDetails/charts/Ordinary_Billing_Chart_For_Balance";
import Bulk_Billing_Chart_For_Units from "../../components/mainTopics/billing&payments/customerDetails/charts/Bulk_Billing_Chart_For_Units";
import Bulk_Billing_Chart_For_Amount from "../../components/mainTopics/billing&payments/customerDetails/charts/Bulk_Billing_Chart_For_Amount";
import Bulk_Billing_Chart_For_Balance from "../../components/mainTopics/billing&payments/customerDetails/charts/Bulk_Billing_Chart_For_Balance";

import {
  Customer,
  OrdinaryCusTransaction,
  BulkCustomer,
} from "../../data/DataTypes";

import { postJSON } from "../../helpers/LoginHelper";

const CustomerDetails = () => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [ord_cust_data, setOrd_cust_data] =
    useState<OrdinaryCusTransaction | null>(null);
  const [bulkCustomer, setBulkCustomer] = useState<BulkCustomer | null>(null);
  const [isSpecial, setIsSpecial] = useState<boolean>(false);

  const handleFormSubmit = async (details: {
    acctNo: string;
    FbillCycle: number;
    TbillCycle: number;
  }) => {
    const isSpecialCustomer = details.acctNo.charAt(2) === "7";
    setIsSpecial(isSpecialCustomer);

    if (isSpecialCustomer) {
      const specialCustomer = await postJSON(
        "/CEBINFO_API_2025/api/bulkBreakup5",
        details
      );
      setBulkCustomer(specialCustomer);
      setCustomer(null); // Clear previous ordinary data
      setOrd_cust_data(null);
    } else {
      const ordinaryCustomer = await postJSON(
        "/CEBINFO_API_2025/api/OrdinaryReadingHistory",
        details
      );
      const ordinaryTransaction = await postJSON(
        "/CEBINFO_API_2025/api/OrdinaryCusTransaction",
        details
      );
      setCustomer(ordinaryCustomer);
      setOrd_cust_data(ordinaryTransaction);
      setBulkCustomer(null); // Clear previous special data
    }
  };

  return (
    <div className="p-2 sm:p-2 md:p-1 w-full max-w-[2000px] mx-auto">
      <div className="w-full flex flex-col gap-2 sm:gap-4 text-sm">
        <BillingForm onSubmit={handleFormSubmit} />
      </div>

      <div className="w-full mt-4 sm:mt-6 md:mt-3">
        {isSpecial && bulkCustomer ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-4">
            <div className="w-full h-[300px] sm:h-[400px]">
              <Bulk_Billing_Chart_For_Units
                data={bulkCustomer.customerTransDetail}
              />
            </div>
            <div className="w-full h-[300px] sm:h-[400px]">
              <Bulk_Billing_Chart_For_Amount
                data={bulkCustomer.customerTransDetail}
              />
            </div>
            <div className="w-full h-[300px] sm:h-[400px]">
              <Bulk_Billing_Chart_For_Balance
                data={bulkCustomer.customerTransDetail}
              />
            </div>
          </div>
        ) : customer && ord_cust_data ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-4">
            <div className="w-full h-[300px] sm:h-[400px]">
              <Ordinary_Biling_Chart_For_Units
                data={customer.customerReadDetail}
              />
            </div>
            <div className="w-full h-[300px] sm:h-[400px]">
              <Ordinary_Billing_Chart_For_Amount
                data={ord_cust_data.customerTransDetail}
              />
            </div>
            <div className="w-full h-[300px] sm:h-[400px]">
              <Ordinary_Billing_Chart_For_Balance
                data={ord_cust_data.customerTransDetail}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CustomerDetails;
