import pandas as pd
import scrape_add_info as sai

FILE_TO_READ = "2025_26_Term_2.csv"

def main():
    headers = [
        "Term", "Session Bidding Window", "Course Code", "Description",
        "Section", "Median Bid", "Min Bid", "Vacancy", "Opening Vacancy",
        "Before Process Vacancy", "After Process Vacancy", "D.I.C.E",
        "Enrolled Students", "Instructor", "School/Department"
    ]

    df = pd.read_csv(FILE_TO_READ, names=headers,skiprows=1)# skip first row as  it is junk 
    distinct_classes  = df["Section"].str.split("|").str[1].str.strip().unique().tolist()
    print("number of classes" + str(len(distinct_classes)))
    sai.scrape(distinct_classes)




if __name__ == "__main__":
    main()    