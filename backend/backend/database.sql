CREATE DATABASE BLOODBANK;
USE BLOODBANK;
CREATE TABLE blood (
    Blood_ID INT PRIMARY KEY,
    Blood_Type VARCHAR(5),
    Cost DECIMAL(10,2),
    Donor_ID INT
);

CREATE TABLE bloodbank (
    BloodBank_ID INT PRIMARY KEY,
    Blood_Type VARCHAR(5)
);

CREATE TABLE bloodbankmanager (
    Employee_ID INT PRIMARY KEY,
    Name VARCHAR(50),
    Contact_Number VARCHAR(15),
    BloodBank_ID INT,
    FOREIGN KEY (BloodBank_ID) REFERENCES bloodbank(BloodBank_ID)
);

CREATE TABLE bloodrequest (
    Request_ID INT PRIMARY KEY,
    Blood_Type VARCHAR(5),
    Patient_ID INT,
    Hospital_Name VARCHAR(100)
);

CREATE TABLE bloodstorage (
    Storage_ID INT PRIMARY KEY,
    Blood_ID INT,
    BloodBank_ID INT,
    FOREIGN KEY (Blood_ID) REFERENCES blood(Blood_ID),
    FOREIGN KEY (BloodBank_ID) REFERENCES bloodbank(BloodBank_ID)
);

CREATE TABLE bloodtest (
    Test_ID INT PRIMARY KEY,
    Blood_ID INT,
    Test_Result VARCHAR(20),
    FOREIGN KEY (Blood_ID) REFERENCES blood(Blood_ID)
);

CREATE TABLE delivery (
    Delivery_ID INT PRIMARY KEY,
    Order_ID INT,
    Patient_ID INT
);

CREATE TABLE donationcamp (
    Camp_ID INT PRIMARY KEY,
    Location VARCHAR(50),
    Date DATE
);

CREATE TABLE donor (
    Donor_ID INT PRIMARY KEY,
    Donor_Name VARCHAR(50),
    DOB DATE,
    Contact_Number VARCHAR(15)
);

CREATE TABLE donorcamp (
    Donor_ID INT,
    Camp_ID INT,
    PRIMARY KEY (Donor_ID, Camp_ID),
    FOREIGN KEY (Donor_ID) REFERENCES donor(Donor_ID),
    FOREIGN KEY (Camp_ID) REFERENCES donationcamp(Camp_ID)
);

CREATE TABLE hospital (
    Hospital_Name VARCHAR(100) PRIMARY KEY,
    Address VARCHAR(100),
    Contact_Number VARCHAR(15)
);

CREATE TABLE inventory (
    Inventory_ID INT PRIMARY KEY,
    BloodBank_ID INT,
    Blood_Type VARCHAR(5),
    Quantity INT,
    FOREIGN KEY (BloodBank_ID) REFERENCES bloodbank(BloodBank_ID)
);

CREATE TABLE orders (
    Order_ID INT PRIMARY KEY,
    Blood_ID INT,
    Hospital_Name VARCHAR(100),
    FOREIGN KEY (Blood_ID) REFERENCES blood(Blood_ID),
    FOREIGN KEY (Hospital_Name) REFERENCES hospital(Hospital_Name)
);

CREATE TABLE patient (
    Patient_ID INT PRIMARY KEY,
    Patient_Name VARCHAR(50),
    Contact_Number VARCHAR(15)
);

CREATE TABLE receptionist (
    Employee_ID INT PRIMARY KEY,
    Employee_Name VARCHAR(50),
    Contact_Number VARCHAR(15)
);