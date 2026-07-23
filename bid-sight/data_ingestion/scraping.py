from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import csv
import os 
import json, time
AUTH_FILE = "auth.json"
TARGET_URL = "https://boss.intranet.smu.edu.sg/OverallResults.aspx" 
BASE_URL = "https://boss.intranet.smu.edu.sg/"
OUTPUT_FILE = "2021_22_Term_2.csv"

LATEST_TERM = "2025-26 Term 3B"


def is_logged_out(page) -> bool:
    """
    Heuristic check for whether the session has expired.
    Adjust this to match what YOUR site does when logged out
    (e.g. redirected to /login, or a 'Sign in' button appears).
    """
    return "login" in page.url.lower()

def scrape():
    with open(AUTH_FILE) as f:
        auth = json.load(f)
        for c in auth.get("cookies", []):
            if "session" in c["name"].lower() or "auth" in c["name"].lower():
                print(c["name"], "expires at", c.get("expires"), "now is", time.time())
    with sync_playwright() as p:
        browser = p.chromium.launch(headless = True)
        context = browser.new_context(storage_state=AUTH_FILE)
        page = context.new_page()

        page.goto(TARGET_URL)
        page.wait_for_load_state("networkidle")
        if is_logged_out(page):
            print("Session expired rerun login script to refresh it")
            browser.close()
            return 
        
        #script logic here 
        select_term(page,"2021-22 Term 2")
        
        page.wait_for_load_state("load")
        
        time.sleep(5)
        search(page)
        page.wait_for_selector(
            '#RadGrid_OverallResults_ctl00_ctl03_ctl01_PageSizeComboBox_Arrow',
            state='visible'
        )
        time.sleep(5)
        set_page_size(page,"50")
        time.sleep(5)


        # page.pause()
        

        page_num = 0
        all_rows = []
        headers =[]
  
        while True:# clicking through all available buttons 
            h,rows = scrape_page(page)
            if page_num == 0 :
                headers = h
            all_rows.extend(rows)
            print(f"Page {page_num  + 1 } done , total rows : {len(all_rows)}")
            

            #save every page
            
            save_csv(headers,all_rows)
           
            
            next_btn = page.locator('[title="Next Page"]')
            if next_btn.count() == 0:
                break # future proofing in case no next button in the future 
            onclick = next_btn.get_attribute("onclick")
            if onclick == "return false;":
                break
            
            next_btn.click()
            page.wait_for_load_state("networkidle")
            page_num += 1
            time.sleep(0.5)

        

        
    

def scrape_page(page):
    html = page.content()
    soup = BeautifulSoup(html,"html.parser")
    panel = soup.find("div", id="UpdatePanel_Result" )
    bosstable = panel.find("table")



    #extrat rows
    headers = []
    rows = []

    for row in bosstable.find_all("tr"):
        if row.find("th"): # table headers 
            headers = [th.get_text(strip = True) for th in row.find_all("th")]
        else:
            cells = []
            for td in row.find_all(["td", "th"]):
                
                text = td.get_text(strip = True)
            
                link = td.find("a")
                href = link.get("href") if link else None
                if href : #is section td
                    cells.append(f"{text} | {BASE_URL + href}")
                else:
                    cells.append(text)
        
        # print(len(cells))
            if len(cells) < 16:
                continue
            rows.append(cells)
    return headers, rows

def select_term(page,term_text):
    page.click('#rcboTerm_Arrow')
    dropdown = page.locator("#rcboTerm_DropDown")
    if term_text != LATEST_TERM:
        dropdown.locator(".rcbList li label").filter(has_text=term_text).click()
        dropdown.locator(".rcbList li label").filter(has_text=LATEST_TERM).click()
    
    page.wait_for_load_state("networkidle")

def set_page_size(page, size="50"):
    page.click("#RadGrid_OverallResults_ctl00_ctl03_ctl01_PageSizeComboBox_Arrow")
    dropdown = page.locator("#RadGrid_OverallResults_ctl00_ctl03_ctl01_PageSizeComboBox_DropDown")
    dropdown.wait_for(state="visible")
    dropdown.locator("li").filter(has_text=size).click()
    page.wait_for_load_state("networkidle")
    # page.pause()

# import re

# def set_page_size(page, size="50"):
#     arrow = page.locator("#RadGrid_OverallResults_ctl00_ctl03_ctl01_PageSizeComboBox_Arrow")
#     arrow.dispatch_event("mousedown")
#     dropdown = page.locator("#RadGrid_OverallResults_ctl00_ctl03_ctl01_PageSizeComboBox_DropDown")
#     dropdown.wait_for(state="visible")
#     dropdown.locator("li").filter(has_text=re.compile(f"^{size}$")).click()
#     page.wait_for_load_state("networkidle")





def search(page):
    page.click("#RadButton_Search_input")
    page.wait_for_load_state("networkidle")

def save_csv(headers,rows):
    with open(OUTPUT_FILE, "w", newline= "", encoding="utf-8") as f :
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)
    
    

            


if __name__ == "__main__":
    scrape()