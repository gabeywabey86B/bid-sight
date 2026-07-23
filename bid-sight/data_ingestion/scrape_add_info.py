
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import csv
import os
import time 

AUTH_FILE = "auth.json"
OUTPUT_FILE = "2025_26_Term2_section_info.csv"
CHECKPOINT_EVERY = 50



def get_unique_classes(list_of_links):
    return list(set(list_of_links))

def is_logged_out(page) -> bool:
    """
    Heuristic check for whether the session has expired.
    Adjust this to match what YOUR site does when logged out
    (e.g. redirected to /login, or a 'Sign in' button appears).
    """
    return "login" in page.url.lower()


def scrape(course_url_list):
    total_rows_processed = 0
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(storage_state=AUTH_FILE)
        page = context.new_page()
        buffer = []
        already_scraped_urls = get_scraped_urls()
        for i,url in enumerate(course_url_list):
            print("[DEBUG] 1 row processed")
            if url in already_scraped_urls:
                continue
            # time.sleep(0.2)
            page.goto(url)
            page.wait_for_load_state("networkidle")

            if is_logged_out(page):
                print("Session expired — rerun login script to resume")
                if buffer:
                    write_csv(buffer)
                    total_rows_processed += len(buffer)
                    print(f"rows processed this session {total_rows_processed}")
                browser.close()
                return

            row = scrape_page(page,url)
            buffer.append(row)

            if(i + 1) % CHECKPOINT_EVERY == 0:
                write_csv(buffer)
                total_rows_processed += len(buffer)
                print(f"rows processed this session {total_rows_processed}")
                buffer = []
        if buffer:
            write_csv(buffer)
            total_rows_processed += len(buffer)
            print(f"rows processed this session {total_rows_processed}")


def scrape_page(page,url):
    html = page.content()
    soup = BeautifulSoup(html, "html.parser")

    #get couse and section 
    course,section = [word.strip() for word in soup.find('span', id ="lblClassInfoHeader").text.split(' - ')]
    courseID = course+section

    #get table and meeting
    
    table = soup.find("table", id="RadGrid_MeetingInfo_ctl00")
    course_inf_by_day = []

    for row in table.find_all("tr"):
        if row.find("th"):
            headers = [th.get_text(strip = True) for th in row.find_all("th")]

            start_time_index = headers.index("Start Time")
            

            end_time_index = headers.index("End Time")
            

            day_index = headers.index("Day")
           

            type_index = headers.index("Type")
        else:
            td_list = [td.get_text(strip = True) for td in row.find_all("td")]
            if td_list[type_index].upper() != "CLASS":
                continue

            course_inf_by_day.append(f"Day: {td_list[day_index]}, start time: {td_list[start_time_index]},end time : {td_list[end_time_index]}")

    #find course areas 
    course_area_string = ""
    course_areas = soup.select_one('#lblCourseAreas')
    if course_areas:
        course_areas_list = [li.get_text(strip = True) for li in course_areas.find_all("li")]
        #course area as a string 
        course_area_string = '|'.join(course_areas_list)
        
    return {
        "courseID": courseID,
        "schedule": '|'.join(course_inf_by_day),
        "course_areas": course_area_string,
        "url": url
    }

def write_csv(buffer):
    write_header = not os.path.exists(OUTPUT_FILE)
    with open(OUTPUT_FILE,"a", newline="",encoding='utf-8') as f :
        writer = csv.DictWriter(f,fieldnames=["courseID","schedule","course_areas","url"])
        if write_header:
            writer.writeheader()
        writer.writerows(buffer)
def get_scraped_urls():
    if not os.path.exists(OUTPUT_FILE):
        return set()
    with open(OUTPUT_FILE, newline="",encoding="utf-8") as f:
         return {row["url"] for row in csv.DictReader(f)}



if __name__ == "__main__":
    scrape()
