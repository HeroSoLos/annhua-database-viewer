import re

def remove_dataset(dataset_name):
    # Read the existing content of the data.js file
    with open('data.js', 'r', encoding='utf-8') as file:
        existing_content = file.read()

    # Use a regular expression to find and remove the dataset
    pattern = re.compile(rf'window\.{dataset_name}\s*=\s*\[.*?\];', re.DOTALL)
    new_content = re.sub(pattern, '', existing_content)

    # Write the updated content back to the data.js file
    with open('data.js', 'w', encoding='utf-8') as file:
        file.write(new_content)

    print(f"Dataset '{dataset_name}' has been successfully removed from data.js")

def main():
    dataset_name = input("Enter the dataset name to remove: ")
    remove_dataset(dataset_name)

if __name__ == "__main__":
    main()