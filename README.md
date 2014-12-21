# CiviCRM command line
This program allows you to search your civicrm contacts and print the result, from the comfort of your shell. 
After you install it globally, it creates a program *civicrm" you can call from the cli.


I wrote it because it's faster to type
    $civicrm Xavier
than going to a browser, authenticating, going to /civicrm and type on the search tool on the top left to get contact detail 

you can have several civicrm sites you can query

##installation
$sudo npm -g install clicivi

##configuration
The configuration file contains all the key and api_keys of your site and is stored in ~/.config/civicrm.json

The needed parameters (site url, key, api_key) are going to be prompted the first time you run the program or when you run 
    $civicrm setup

you can as well provide them from the command line
    $civicrm setup -s example --server=https://example.org --key=yoursitekey --api_key=theapikeyofyouruser


##usage
    $civicrm -s example xavier
    --> return the list of matching contacts
    42: Dutoit, Xavier

    $civicrm -s example view 42
    Xavier Dutoit
      +41 22 123 45 67
      demo@example.org

    $civicrm -s example csv xavier > xavier.csv

