Feature: Preferences Page
  As a user configuring the kiln controller
  I want to view and modify system settings
  So that I can customize the controller behavior

  Background:
    Given the PIDKiln frontend is loaded in a browser
    And the WebSocket is connected
    And I am on the Preferences view

  @preferences @display
  Scenario: Display current preferences
    Then I should see all preference fields organized in sections:
      | section     | fields                                              |
      | WiFi        | SSID, Password, Mode, Retry Count                   |
      | Auth        | Username, Password                                  |
      | NTP         | Server1, Server2, Server3, GMT Offset, DST Offset   |
      | PID         | Window, Kp, Ki, Kd, POE, Temp Threshold             |
      | Logging     | Log Window, Files Limit                             |
      | Temperature | Min, Max, Max Housing, Thermal Runaway              |
      | Debug       | Serial, Syslog, Syslog Server, Syslog Port          |

  @preferences @edit
  Scenario: Edit a preference value
    When I change the "PID_Kp" value to "25"
    And I click the "Save" button
    Then the preference should be saved to the server
    And a success message should be displayed

  @preferences @password-toggle
  Scenario: Toggle password visibility
    Given the WiFi password field shows masked characters
    When I click the password visibility toggle
    Then the password should be visible as plain text
    When I click the toggle again
    Then the password should be masked again

  @preferences @download-config
  Scenario: Download configuration file
    When I click the "Download Config" button
    Then the browser should download "pidkiln.conf"
    And the file should contain the current configuration in INI format

  @preferences @validation
  Scenario: Validate preference values
    When I enter an invalid value for "MAX_Temperature"
    Then a validation error should be displayed
    And the Save button should be disabled until corrected

