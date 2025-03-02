import csv
import json

def read_csv(file_path):
    with open(file_path, mode='r', encoding='utf-8-sig') as file:
        reader = csv.DictReader(file)
        return [row for row in reader]

def format_js_data(data_set_name, data):
    return f'window.{data_set_name} = {json.dumps(data, indent=4)};'

def main():
    file_path = input("Enter the path to the CSV file: ")
    data_set_name = input("Enter the data set name: ")

    new_data = read_csv(file_path)

    # Format the new data as a JavaScript variable assignment
    formatted_data = format_js_data(data_set_name, new_data)

    # Read the existing content of the data.js file
    with open('data.js', 'r', encoding='utf-8') as file:
        existing_content = file.read()

    # Prepend the new data set to the existing content
    new_content = formatted_data + '\n' + existing_content

    # Write the combined content back to the data.js file
    with open('data.js', 'w', encoding='utf-8') as file:
        file.write(new_content)

    print(f"Data has been successfully inserted into {data_set_name} in data.js")

if __name__ == "__main__":
    main()